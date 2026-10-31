from __future__ import annotations

import os
import random
import re
import shutil
import signal
import subprocess
import threading
from collections import deque
from dataclasses import dataclass
from pathlib import Path
from typing import Callable, Optional

from PIL import Image

MODEL_FILE = "flux_2_klein_4b_q6p.ckpt"
MODEL_LABEL = "FLUX.2 Klein 4B — 6-bit"
DEFAULT_STRENGTH = 1.0
DEFAULT_STEPS = 4
DEFAULT_CFG = 1.0
MODEL_GRID = 64
# Primary edit image + up to this many extra references (Klein supports 4 total).
MAX_REFERENCE_IMAGES = 3
ALLOWED_FORMATS = {"PNG", "JPEG", "WEBP"}
ANSI_ESCAPE = re.compile(r"\x1b\[[0-9;]*[A-Za-z]")
PROGRESS_LINE = re.compile(
    r"^(Starting|Processing|Sampling|Finishing|Generated)\.*\s*"
    r"(?:(\d+)\s*/\s*(\d+)\s*)?\[[^\]]*\]\s*(\d+)\s*%"
)


class EditCancelled(Exception):
    pass


@dataclass(frozen=True)
class ProgressEvent:
    phase: str
    percent: int
    step: Optional[int] = None
    total: Optional[int] = None


def parse_progress(line: str) -> Optional[ProgressEvent]:
    match = PROGRESS_LINE.match(ANSI_ESCAPE.sub("", line).strip())
    if not match:
        return None
    phase, step, total, percent = match.groups()
    return ProgressEvent(
        phase=phase,
        percent=int(percent),
        step=int(step) if step else None,
        total=int(total) if total else None,
    )


def configured_steps() -> int:
    return int(os.environ.get("FLUX_STEPS", str(DEFAULT_STEPS)))


def models_directory() -> Path:
    configured = os.environ.get("DRAWTHINGS_MODELS_DIR")
    if configured:
        return Path(configured).expanduser()
    return Path.home() / "Library/Containers/com.liuliu.draw-things/Data/Documents/Models"


def cli_executable() -> str:
    return os.environ.get("DRAWTHINGS_CLI", "draw-things-cli")


@dataclass(frozen=True)
class PreparedImage:
    original_width: int
    original_height: int
    canvas_width: int
    canvas_height: int


def model_canvas(width: int, height: int) -> tuple[int, int]:
    if width < 1 or height < 1:
        raise ValueError("Image dimensions must be positive.")

    def snap(value: int) -> int:
        return max(MODEL_GRID, ((value + MODEL_GRID - 1) // MODEL_GRID) * MODEL_GRID)

    return snap(width), snap(height)


def pad_to_canvas(image: Image.Image, canvas_width: int, canvas_height: int) -> Image.Image:
    if image.size == (canvas_width, canvas_height):
        return image.copy()
    canvas = Image.new(image.mode, (canvas_width, canvas_height))
    left = (canvas_width - image.width) // 2
    top = (canvas_height - image.height) // 2
    canvas.paste(image, (left, top))
    if left:
        edge = image.crop((0, 0, 1, image.height)).resize((left, image.height), Image.Resampling.NEAREST)
        canvas.paste(edge, (0, top))
    right = canvas_width - left - image.width
    if right:
        edge = image.crop((image.width - 1, 0, image.width, image.height)).resize((right, image.height), Image.Resampling.NEAREST)
        canvas.paste(edge, (left + image.width, top))
    if top:
        edge = canvas.crop((0, top, canvas_width, top + 1)).resize((canvas_width, top), Image.Resampling.NEAREST)
        canvas.paste(edge, (0, 0))
    bottom = canvas_height - top - image.height
    if bottom:
        edge = canvas.crop((0, top + image.height - 1, canvas_width, top + image.height))
        edge = edge.resize((canvas_width, bottom), Image.Resampling.NEAREST)
        canvas.paste(edge, (0, top + image.height))
    return canvas


def crop_to_original(path: Path, width: int, height: int) -> None:
    with Image.open(path) as image:
        image.load()
        if image.size == (width, height):
            return
        left = (image.width - width) // 2
        top = (image.height - height) // 2
        cropped = image.crop((left, top, left + width, top + height))
        cropped.load()
    cropped.save(path)


def prepare_image(source: Path, destination: Path) -> PreparedImage:
    with Image.open(source) as image:
        if image.format not in ALLOWED_FORMATS:
            raise ValueError("Upload a PNG, JPEG, or WebP image.")
        rgb = image.convert("RGB")
        canvas_width, canvas_height = model_canvas(rgb.width, rgb.height)
        prepared = pad_to_canvas(rgb, canvas_width, canvas_height)
        destination.parent.mkdir(parents=True, exist_ok=True)
        prepared.save(destination, "PNG")
        return PreparedImage(rgb.width, rgb.height, canvas_width, canvas_height)


def build_command(
    *,
    cli: str,
    models_dir: Path,
    source: Path,
    destination: Path,
    prompt: str,
    strength: float,
    width: int,
    height: int,
    seed: int,
    references: Optional[list[Path]] = None,
) -> list[str]:
    steps = str(configured_steps())
    cfg = os.environ.get("FLUX_CFG", str(DEFAULT_CFG))
    refs = list(references or [])
    if len(refs) > MAX_REFERENCE_IMAGES:
        raise ValueError(f"Upload at most {MAX_REFERENCE_IMAGES} reference images.")
    command = [
        cli,
        "generate",
        "--model",
        MODEL_FILE,
        "--models-dir",
        str(models_dir),
        "--prompt",
        prompt,
        "--image",
        str(source),
    ]
    for path in refs:
        command.extend(["--image", str(path)])
    # With extra references, omit --strength so Klein treats every --image as a
    # reference (image 1, 2, …). Passing strength puts image 1 on the canvas as
    # img2img and Klein mostly "traces" it, so outfit/style refs barely apply.
    if not refs:
        command.extend(["--strength", f"{strength:.2f}"])
    command.extend(
        [
            "--steps",
            steps,
            "--cfg",
            cfg,
            "--width",
            str(width),
            "--height",
            str(height),
            "--seed",
            str(seed),
            "--output",
            str(destination),
            "--local",
            "--offline",
            "--no-download-missing",
            "--disable-preview",
        ]
    )
    return command


def runtime_status() -> dict:
    cli = cli_executable()
    if os.sep in cli:
        resolved = cli if Path(cli).is_file() else None
    else:
        resolved = shutil.which(cli)
    model_path = models_directory() / MODEL_FILE
    return {
        "model": MODEL_LABEL,
        "model_file": MODEL_FILE,
        "model_ready": model_path.is_file(),
        "cli_ready": resolved is not None,
        "cli": resolved or cli,
    }


def ensure_ready() -> dict:
    status = runtime_status()
    if not status["cli_ready"]:
        raise RuntimeError("draw-things-cli is not installed. Install it with: brew install draw-things-cli")
    if not status["model_ready"]:
        raise RuntimeError(f"Missing local model file: {models_directory() / MODEL_FILE}")
    return status


def stop_process(process: subprocess.Popen, grace_seconds: float = 5.0) -> None:
    if process.poll() is not None:
        return
    try:
        os.killpg(process.pid, signal.SIGTERM)
    except ProcessLookupError:
        return
    try:
        process.wait(timeout=grace_seconds)
    except subprocess.TimeoutExpired:
        try:
            os.killpg(process.pid, signal.SIGKILL)
        except ProcessLookupError:
            pass


def edit_image(
    source: Path,
    prompt: str,
    destination: Path,
    strength: float,
    width: int,
    height: int,
    seed: Optional[int] = None,
    original_size: Optional[tuple[int, int]] = None,
    references: Optional[list[Path]] = None,
    on_progress: Optional[Callable[[ProgressEvent], None]] = None,
    on_start: Optional[Callable[[subprocess.Popen], None]] = None,
    cancelled: Callable[[], bool] = lambda: False,
) -> dict:
    cleaned = prompt.strip()
    if not cleaned:
        raise ValueError("Enter an edit instruction.")
    if not 0 < strength <= 1:
        raise ValueError("Edit strength must be greater than 0 and at most 1.")
    refs = list(references or [])
    if len(refs) > MAX_REFERENCE_IMAGES:
        raise ValueError(f"Upload at most {MAX_REFERENCE_IMAGES} reference images.")
    status = ensure_ready()

    chosen_seed = random.randrange(0, 2**32) if seed is None else seed
    command = build_command(
        cli=status["cli"],
        models_dir=models_directory(),
        source=source,
        destination=destination,
        prompt=cleaned,
        strength=strength,
        width=width,
        height=height,
        seed=chosen_seed,
        references=refs,
    )
    destination.parent.mkdir(parents=True, exist_ok=True)
    if cancelled():
        raise EditCancelled()

    process = subprocess.Popen(
        command,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        bufsize=1,
        start_new_session=True,
    )
    timed_out = threading.Event()

    def expire() -> None:
        timed_out.set()
        stop_process(process)

    timer = threading.Timer(float(os.environ.get("FLUX_TIMEOUT", "900")), expire)
    timer.daemon = True
    timer.start()
    tail: deque = deque(maxlen=30)
    try:
        if on_start:
            on_start(process)
        if cancelled():
            stop_process(process)
        assert process.stdout is not None
        for raw in process.stdout:
            line = ANSI_ESCAPE.sub("", raw).strip()
            if not line:
                continue
            tail.append(line)
            event = parse_progress(line)
            if event and on_progress:
                on_progress(event)
        returncode = process.wait()
    finally:
        timer.cancel()
        stop_process(process)

    if cancelled():
        destination.unlink(missing_ok=True)
        raise EditCancelled()
    if timed_out.is_set():
        raise RuntimeError("The model timed out before finishing the edit.")
    if returncode != 0:
        raise RuntimeError("\n".join(tail) or "draw-things-cli failed.")
    if not destination.is_file() or destination.stat().st_size == 0:
        raise RuntimeError("The model finished without writing an image.")
    output_width, output_height = original_size or (width, height)
    if (output_width, output_height) != (width, height):
        crop_to_original(destination, output_width, output_height)
    return {
        "model": MODEL_LABEL,
        "width": output_width,
        "height": output_height,
        "seed": chosen_seed,
    }
