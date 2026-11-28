#!/usr/bin/env python3
"""Optimized GPU-cloud AIGC video watermark cleaner (Wan 2.1 3D & 2D SynthID)."""

from __future__ import annotations

import argparse
from collections.abc import Iterator
from concurrent.futures import ThreadPoolExecutor
from contextlib import suppress
from fractions import Fraction
import json
import os
from pathlib import Path
import shutil
import subprocess
import sys
import time
from typing import Any

MAX_FPS = 30
REQUIRED_CLEANER_VERSION = "0.75.0"
CLEANER_PACKAGE_SPEC = f"remove-ai-watermarks[video,diffusion]=={REQUIRED_CLEANER_VERSION}"

WAN21_MODEL_ID = "Wan-AI/Wan2.1-T2V-1.3B-Diffusers"
WAN21_MODEL_REVISION = "0fad780a534b6463e45facd96134c9f345acfa5b"
WAN21_FLOW_SHIFT = 3.0
WAN21_STRENGTH = 0.38
WAN21_DEFAULT_STEPS = 8
WAN21_DEFAULT_MAX_SIDE = 1280
WAN21_OVERLAP_FRAMES = 17
WAN21_PROMPT = "High fidelity natural video, sharp details, accurate motion, clean cinematic lighting."
WAN21_REQUIRED_MODULES = (
    ("torch", "torch"),
    ("diffusers", "diffusers>=0.38.0"),
    ("transformers", "transformers>=4.49.0"),
    ("accelerate", "accelerate>=0.25.0"),
    ("safetensors", "safetensors"),
    ("sentencepiece", "sentencepiece>=0.2.0"),
    ("ftfy", "ftfy>=6.3.1"),
    ("huggingface_hub", "huggingface-hub>=0.25.0"),
    ("hf_transfer", "hf-transfer>=0.1.8"),
    ("PIL", "pillow>=10.0.0"),
    ("numpy", "numpy"),
)
WAN_DOWNLOAD_WORKERS = 8


def _log(message: str) -> None:
    print(message, flush=True)


def _emit_progress(percent: float, stage: str, eta_seconds: float | None = None) -> None:
    payload: dict[str, Any] = {
        "percent": max(0, min(100, round(percent))),
        "stage": stage,
    }
    if eta_seconds is not None and eta_seconds >= 0:
        payload["eta_seconds"] = round(eta_seconds)
    print(f"@@PROGRESS {json.dumps(payload, ensure_ascii=False)}", flush=True)


def estimate_video_chunks(source: Path, *, max_side: int) -> tuple[int, int, Fraction, bool, int, int, int, int]:
    """Probe geometry, working size, chunk size, and estimated chunk count for one video."""
    import math

    orig_w, orig_h, source_fps, has_audio = probe_video(source)
    target_fps = min(source_fps, Fraction(MAX_FPS, 1))
    work_w, work_h = compute_work_size(orig_w, orig_h, max_side)
    chunk_frames = compute_chunk_frames(work_w, work_h)
    step = chunk_frames - WAN21_OVERLAP_FRAMES

    dur_probe = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(source)],
        capture_output=True,
        text=True,
    )
    est_frames = 0
    with suppress(ValueError):
        est_frames = max(1, round(float(dur_probe.stdout.strip()) * float(target_fps)))
    est_chunks = 1 if est_frames <= chunk_frames else 1 + math.ceil((est_frames - chunk_frames) / step)
    return orig_w, orig_h, target_fps, has_audio, work_w, work_h, chunk_frames, est_chunks


def _prompt_cache_path() -> Path:
    cache_root = Path(os.environ.get("XDG_CACHE_HOME", Path.home() / ".cache")) / "aigc-cleaner"
    return cache_root / f"wan21_prompt_embeds_{WAN21_MODEL_REVISION[:12]}.pt"


def probe_video(source: Path) -> tuple[int, int, Fraction, bool]:
    """Return (width, height, fps, has_audio) for a video file via ffprobe."""
    probe = subprocess.run(
        [
            "ffprobe",
            "-v",
            "error",
            "-show_entries",
            "stream=codec_type,width,height,avg_frame_rate,r_frame_rate",
            "-of",
            "json",
            str(source),
        ],
        check=True,
        stdout=subprocess.PIPE,
        text=True,
    )
    streams = json.loads(probe.stdout).get("streams", [])
    video_stream = next((s for s in streams if s.get("codec_type") == "video"), None)
    if not video_stream:
        raise ValueError(f"Không tìm thấy video stream trong {source.name}")
    width = int(video_stream["width"])
    height = int(video_stream["height"])
    has_audio = any(s.get("codec_type") == "audio" for s in streams)

    fps: Fraction | None = None
    for field in ("avg_frame_rate", "r_frame_rate"):
        try:
            candidate = Fraction(video_stream.get(field, "0"))
        except (ValueError, ZeroDivisionError):
            continue
        if candidate > 0:
            fps = candidate
            break
    if fps is None:
        raise ValueError(f"Không đọc được FPS của video: {source.name}")
    return width, height, fps, has_audio


def compute_work_size(width: int, height: int, max_side: int) -> tuple[int, int]:
    """Compute 16-aligned Wan working resolution bounded by ``max_side`` (0 = native)."""
    if max_side > 0 and max(width, height) > max_side:
        scale = max_side / float(max(width, height))
        work_w = round(width * scale / 16.0) * 16
        work_h = round(height * scale / 16.0) * 16
    else:
        work_w = round(width / 16.0) * 16
        work_h = round(height / 16.0) * 16
    return max(16, work_w), max(16, work_h)


def compute_chunk_frames(work_w: int, work_h: int) -> int:
    """Use 193-frame chunks at <=720p and 81-frame chunks above 720p."""
    return 193 if work_w * work_h <= 1280 * 720 else 81


def _find_cleaner() -> str | None:
    cleaner = shutil.which("remove-ai-watermarks")
    if cleaner is not None:
        return cleaner
    candidate = Path.home() / ".local" / "bin" / "remove-ai-watermarks"
    return str(candidate) if candidate.exists() else None


def _has_required_version(cleaner: str) -> bool:
    probe = subprocess.run([cleaner, "--version"], capture_output=True, text=True)
    return probe.returncode == 0 and REQUIRED_CLEANER_VERSION in (probe.stdout or "")


def ensure_synthid_cleaner() -> str:
    """Ensure remove-ai-watermarks 0.75.0 is installed for the 2D SynthID profile."""
    cleaner = _find_cleaner()
    if cleaner is not None and _has_required_version(cleaner):
        return cleaner

    if shutil.which("uv"):
        subprocess.run(
            ["uv", "tool", "install", "--force", "--python", "3.12", "--torch-backend=auto", CLEANER_PACKAGE_SPEC],
            check=True,
        )
        cleaner = _find_cleaner()
        if cleaner is None:
            raise RuntimeError("uv cài xong nhưng không tìm thấy remove-ai-watermarks")
        return cleaner

    python = sys.executable
    subprocess.run([python, "-m", "pip", "install", "--force-reinstall", CLEANER_PACKAGE_SPEC], check=True)
    cleaner = _find_cleaner() or str(Path(python).parent / "remove-ai-watermarks")
    if not Path(cleaner).exists():
        raise RuntimeError("Không tìm thấy lệnh remove-ai-watermarks sau khi cài package")
    return cleaner


def ensure_wan_dependencies() -> None:
    """Install only missing Wan 2.1 runtime packages into the active Python environment."""
    import importlib.util

    missing = [pkg for mod, pkg in WAN21_REQUIRED_MODULES if importlib.util.find_spec(mod) is None]
    if not missing:
        return

    _log(f"[1/4] Cài package còn thiếu cho Wan 2.1 ({len(missing)} gói): {', '.join(missing)}")
    _emit_progress(3, f"Cài package Wan 2.1 ({len(missing)} gói)")
    if shutil.which("uv"):
        try:
            subprocess.run(["uv", "pip", "install", "--python", sys.executable, *missing], check=True)
            return
        except subprocess.CalledProcessError:
            _log("uv pip install gặp lỗi, fallback sang pip...")
    subprocess.run([sys.executable, "-m", "pip", "install", "--quiet", *missing], check=True)


def download_wan_model(*, include_text_encoder: bool) -> Path:
    """Download Wan 2.1 model files in parallel using hf_transfer + multi-worker hub fetch."""
    os.environ.setdefault("HF_HUB_ENABLE_HF_TRANSFER", "1")
    from huggingface_hub import HfApi, hf_hub_download

    allow_patterns = [
        "model_index.json",
        "scheduler/*",
        "transformer/*",
        "vae/*",
    ]
    if include_text_encoder:
        allow_patterns.extend(["text_encoder/*", "tokenizer/*"])

    t0 = time.monotonic()
    _log(
        f"[2/4] Tải song song Wan 2.1 ({WAN_DOWNLOAD_WORKERS} luồng, "
        f"{'bao gồm UMT5-XXL lần đầu' if include_text_encoder else 'bỏ qua UMT5-XXL vì đã có cache prompt'})..."
    )
    _emit_progress(5, "Kiểm tra & tải model Wan 2.1")
    api = HfApi()
    repo_files = api.list_repo_files(repo_id=WAN21_MODEL_ID, revision=WAN21_MODEL_REVISION)

    def _matches(path: str) -> bool:
        return any(
            path == pattern or (pattern.endswith("/*") and path.startswith(pattern[:-1]))
            for pattern in allow_patterns
        )

    targets = [f for f in repo_files if _matches(f)]
    if not targets:
        raise RuntimeError(f"Không tìm thấy file model trong {WAN21_MODEL_ID}")

    # Download largest files (transformer / text_encoder) first so smaller files finish alongside them.
    targets.sort(key=lambda p: (0 if p.startswith("transformer/") else 1 if p.startswith("text_encoder/") else 2, p))
    completed = 0
    local_dir: Path | None = None

    def _fetch(filename: str) -> Path:
        try:
            return Path(hf_hub_download(repo_id=WAN21_MODEL_ID, revision=WAN21_MODEL_REVISION, filename=filename))
        except Exception:
            # Retry without hf_transfer if the host environment blocks fast Rust transport.
            os.environ["HF_HUB_ENABLE_HF_TRANSFER"] = "0"
            with suppress(Exception):
                import huggingface_hub.constants as hf_constants

                hf_constants.HF_HUB_ENABLE_HF_TRANSFER = False
            return Path(hf_hub_download(repo_id=WAN21_MODEL_ID, revision=WAN21_MODEL_REVISION, filename=filename))

    with ThreadPoolExecutor(max_workers=WAN_DOWNLOAD_WORKERS) as pool:
        for file_path in pool.map(_fetch, targets):
            completed += 1
            if local_dir is None:
                local_dir = file_path.parents[1] if "/" in targets[completed - 1] else file_path.parent
            if completed == len(targets) or completed % 3 == 0:
                _log(f"      Model files: {completed}/{len(targets)}")
                _emit_progress(5 + 10.0 * completed / len(targets), f"Tải model Wan 2.1 ({completed}/{len(targets)})")

    from huggingface_hub import snapshot_download

    snapshot_path = Path(
        snapshot_download(
            repo_id=WAN21_MODEL_ID,
            revision=WAN21_MODEL_REVISION,
            allow_patterns=allow_patterns,
            local_files_only=True,
        )
    )
    _log(f"      Tải & kiểm tra cache xong trong {time.monotonic() - t0:.1f}s")
    return snapshot_path


def load_wan_pipeline(*, vae_bf16: bool = True) -> tuple[Any, Any]:
    """Load Wan 2.1 transformer + VAE on CUDA BF16 and return (pipe, prompt_embeds)."""
    import gc

    import torch
    from diffusers.models.autoencoders.autoencoder_kl_wan import AutoencoderKLWan
    from diffusers.pipelines.wan.pipeline_wan_video2video import WanVideoToVideoPipeline
    from diffusers.schedulers.scheduling_unipc_multistep import UniPCMultistepScheduler

    if not torch.cuda.is_available():
        raise RuntimeError("Wan 2.1 yêu cầu GPU NVIDIA CUDA")
    if not torch.cuda.is_bf16_supported(including_emulation=False):
        raise RuntimeError("Wan 2.1 yêu cầu GPU hỗ trợ native BF16 (RTX 30xx / Ampere trở lên)")

    torch.backends.cuda.matmul.allow_tf32 = True
    torch.backends.cudnn.benchmark = True

    cache_path = _prompt_cache_path()
    has_prompt_cache = cache_path.is_file()
    model_dir = download_wan_model(include_text_encoder=not has_prompt_cache)

    t0 = time.monotonic()
    _log("[3/4] Nạp Wan 2.1 vào VRAM (TF32 + BF16)...")
    _emit_progress(16, "Nạp model Wan 2.1 vào VRAM")
    vae_dtype = torch.bfloat16 if vae_bf16 else torch.float32
    vae = AutoencoderKLWan.from_pretrained(
        str(model_dir),
        subfolder="vae",
        torch_dtype=vae_dtype,
        local_files_only=True,
    )
    vae.enable_slicing()

    prompt_embeds = None
    if has_prompt_cache:
        try:
            prompt_embeds = torch.load(cache_path, map_location="cpu", weights_only=True).to(
                device="cuda", dtype=torch.bfloat16
            )
        except Exception as exc:
            _log(f"      Cache prompt lỗi ({exc}), sẽ encode lại...")
            prompt_embeds = None

    if prompt_embeds is None:
        # Ensure text encoder weights are present if cache was unreadable.
        if not (model_dir / "text_encoder").exists():
            model_dir = download_wan_model(include_text_encoder=True)
        pipe = WanVideoToVideoPipeline.from_pretrained(
            str(model_dir),
            vae=vae,
            torch_dtype=torch.bfloat16,
            local_files_only=True,
        )
        total_vram_gb = torch.cuda.get_device_properties(0).total_memory / (1024**3)
        encode_device = "cuda" if total_vram_gb >= 16.0 else "cpu"
        _log(f"      Encode & cache prompt embedding trên {encode_device.upper()} (chỉ chạy 1 lần đầu)...")
        pipe.text_encoder.to(encode_device)
        with torch.inference_mode():
            embeds, _ = pipe.encode_prompt(
                prompt=WAN21_PROMPT,
                device=torch.device(encode_device),
                num_videos_per_prompt=1,
                do_classifier_free_guidance=False,
            )
            cpu_embeds = embeds.detach().to("cpu", dtype=torch.bfloat16)
        cache_path.parent.mkdir(parents=True, exist_ok=True)
        tmp_cache = cache_path.with_suffix(".pt.tmp")
        torch.save(cpu_embeds, tmp_cache)
        tmp_cache.replace(cache_path)
        prompt_embeds = cpu_embeds.to(device="cuda", dtype=torch.bfloat16)
        pipe.text_encoder = None
        pipe.tokenizer = None
        gc.collect()
        torch.cuda.empty_cache()
    else:
        pipe = WanVideoToVideoPipeline.from_pretrained(
            str(model_dir),
            vae=vae,
            text_encoder=None,
            tokenizer=None,
            torch_dtype=torch.bfloat16,
            local_files_only=True,
        )

    pipe.scheduler = UniPCMultistepScheduler.from_config(pipe.scheduler.config, flow_shift=WAN21_FLOW_SHIFT)
    pipe.to("cuda")
    pipe.set_progress_bar_config(disable=True)
    torch.cuda.empty_cache()
    _log(f"      Model sẵn sàng trên {torch.cuda.get_device_name(0)} trong {time.monotonic() - t0:.1f}s")
    _emit_progress(20, "Model sẵn sàng, bắt đầu xử lý video")
    return pipe, prompt_embeds


def _iter_decoded_rgb_frames(source: Path, work_w: int, work_h: int, target_fps: Fraction) -> Iterator[Any]:
    """Stream resized RGB24 frames from ffmpeg stdout without intermediate files."""
    import numpy as np

    vf = f"fps={float(target_fps):.6f},scale={work_w}:{work_h}:flags=lanczos"
    cmd = [
        "ffmpeg",
        "-nostdin",
        "-loglevel",
        "error",
        "-i",
        str(source),
        "-map",
        "0:v:0",
        "-vf",
        vf,
        "-f",
        "rawvideo",
        "-pix_fmt",
        "rgb24",
        "-",
    ]
    frame_bytes = work_w * work_h * 3
    proc = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    assert proc.stdout is not None
    try:
        while True:
            buf = proc.stdout.read(frame_bytes)
            if not buf:
                break
            if len(buf) != frame_bytes:
                raise RuntimeError("FFmpeg trả thiếu dữ liệu frame khi giải mã video")
            yield np.frombuffer(buf, dtype=np.uint8).reshape((work_h, work_w, 3)).copy()
        rc = proc.wait()
        if rc != 0:
            err = proc.stderr.read().decode(errors="replace") if proc.stderr else ""
            raise RuntimeError(f"FFmpeg decode thất bại (exit {rc}): {err.strip()}")
    finally:
        if proc.poll() is None:
            proc.kill()
            proc.wait()


def _select_video_encoder() -> list[str]:
    """Prefer NVENC on NVIDIA CUDA when available, otherwise fast libx264."""
    probe = subprocess.run(
        [
            "ffmpeg",
            "-nostdin",
            "-loglevel",
            "error",
            "-f",
            "lavfi",
            "-i",
            "color=black:s=64x64:d=0.1",
            "-c:v",
            "h264_nvenc",
            "-f",
            "null",
            "-",
        ],
        capture_output=True,
    )
    if probe.returncode == 0:
        return ["-c:v", "h264_nvenc", "-preset", "p5", "-cq", "18", "-pix_fmt", "yuv420p"]
    return ["-c:v", "libx264", "-preset", "fast", "-crf", "17", "-pix_fmt", "yuv420p"]


def _start_mux_encoder(
    source: Path,
    staged_output: Path,
    *,
    work_w: int,
    work_h: int,
    orig_w: int,
    orig_h: int,
    fps: Fraction,
    has_audio: bool,
) -> subprocess.Popen[bytes]:
    encoder_args = _select_video_encoder()
    cmd = [
        "ffmpeg",
        "-y",
        "-nostdin",
        "-loglevel",
        "error",
        "-f",
        "rawvideo",
        "-pix_fmt",
        "rgb24",
        "-s",
        f"{work_w}x{work_h}",
        "-r",
        f"{float(fps):.6f}",
        "-i",
        "-",
        "-i",
        str(source),
        "-map",
        "0:v:0",
    ]
    if has_audio:
        cmd.extend(["-map", "1:a:0", "-c:a", "copy", "-shortest"])
    if (work_w, work_h) != (orig_w, orig_h):
        cmd.extend(["-vf", f"scale={orig_w}:{orig_h}:flags=lanczos"])
    cmd.extend([
        *encoder_args,
        "-map_metadata",
        "-1",
        "-map_chapters",
        "-1",
        "-fflags",
        "+bitexact",
        "-movflags",
        "+faststart",
        str(staged_output),
    ])
    return subprocess.Popen(cmd, stdin=subprocess.PIPE, stderr=subprocess.PIPE)


def _run_wan_chunk(
    pipe: Any,
    prompt_embeds: Any,
    frames_rgb: list[Any],
    *,
    work_w: int,
    work_h: int,
    steps: int,
    strength: float,
    seed: int,
    chunk_label: str,
    on_step_progress: Any = None,
) -> Any:
    import numpy as np
    from PIL import Image
    import torch

    pil_frames = [Image.fromarray(frame, mode="RGB") for frame in frames_rgb]
    win_t = len(pil_frames)
    pad_t = (4 - ((win_t - 1) % 4)) % 4
    if pad_t:
        pil_frames.extend([pil_frames[-1]] * pad_t)

    step_start = time.monotonic()

    def _on_step(pipeline: Any, step_idx: int, _timestep: Any, _kwargs: dict[str, Any]) -> dict[str, Any]:
        total = max(1, int(getattr(pipeline, "num_timesteps", 1)))
        elapsed = time.monotonic() - step_start
        done = step_idx + 1
        eta = (elapsed / done) * max(0, total - done)
        pct = int(round(done * 100 / total))
        _log(f"      {chunk_label} · Step {done}/{total} ({pct}%) · {elapsed:.1f}s · ETA chunk {eta:.0f}s")
        if on_step_progress is not None:
            on_step_progress(done, total, elapsed)
        return {}

    generator = torch.Generator(device="cuda").manual_seed(seed)
    with torch.inference_mode():
        out = pipe(
            video=pil_frames,
            height=work_h,
            width=work_w,
            num_inference_steps=steps,
            guidance_scale=1.0,
            strength=strength,
            prompt_embeds=prompt_embeds,
            generator=generator,
            output_type="np",
            callback_on_step_end=_on_step,
            callback_on_step_end_tensor_inputs=[],
        ).frames[0]

    arr = np.asarray(out)[:win_t]
    if arr.dtype != np.uint8:
        arr = np.clip(np.rint(arr * 255.0), 0, 255).astype(np.uint8)
    return arr


def clean_video_wan(
    source: Path,
    destination: Path,
    *,
    pipe: Any,
    prompt_embeds: Any,
    wan_steps: int,
    max_side: int,
    strength: float,
    seed: int,
    video_index: int = 1,
    total_videos: int = 1,
    progress_state: dict[str, Any] | None = None,
) -> None:
    """Clean one video with optimized Wan 2.1 chunking and streaming FFmpeg upscale."""
    from itertools import islice
    import numpy as np
    import torch

    orig_w, orig_h, target_fps, has_audio, work_w, work_h, chunk_frames, est_chunks = estimate_video_chunks(
        source, max_side=max_side
    )
    overlap = WAN21_OVERLAP_FRAMES
    step = chunk_frames - overlap
    state = progress_state if progress_state is not None else {
        "chunk_durations": [],
        "chunks_done": 0,
        "total_chunks": est_chunks,
    }
    total_chunks = max(1, int(state["total_chunks"]))

    _log(
        f"[4/4] Xử lý {source.name} ({video_index}/{total_videos}): {orig_w}x{orig_h} → "
        f"Wan {work_w}x{work_h}@{float(target_fps):g}fps ({wan_steps} steps, "
        f"chunk={chunk_frames}, ~{est_chunks} chunk) → xuất {orig_w}x{orig_h}"
    )

    fade_in = (0.5 - 0.5 * np.cos(np.pi * np.arange(1, overlap + 1, dtype=np.float32) / (overlap + 1)))[
        :, None, None, None
    ]
    fade_out = 1.0 - fade_in

    destination.parent.mkdir(parents=True, exist_ok=True)
    staged = destination.with_name(f".{destination.stem}.tmp{destination.suffix}")
    if staged.exists():
        staged.unlink()

    encoder = _start_mux_encoder(
        source,
        staged,
        work_w=work_w,
        work_h=work_h,
        orig_w=orig_w,
        orig_h=orig_h,
        fps=target_fps,
        has_audio=has_audio,
    )
    assert encoder.stdin is not None
    t_video = time.monotonic()
    frames_it = _iter_decoded_rgb_frames(source, work_w, work_h, target_fps)
    try:
        peek = next(frames_it, None)
        if peek is None:
            raise RuntimeError(f"Video không có frame nào: {source.name}")
        in_tail: list[Any] = []
        out_tail: Any = None
        chunk_idx = 0
        written = 0

        while True:
            if chunk_idx > 0:
                torch.cuda.empty_cache()
            need = chunk_frames if chunk_idx == 0 else step
            in_buf = [*in_tail, peek, *islice(frames_it, need - 1)]
            next_peek = next(frames_it, None)

            chunks_done = int(state["chunks_done"])
            chunk_durations: list[float] = state["chunk_durations"]
            effective_total = max(total_chunks, chunks_done + 1)
            chunk_label = f"Video {video_index}/{total_videos} · Chunk {chunk_idx + 1}/~{est_chunks}"
            avg_chunk = sum(chunk_durations) / len(chunk_durations) if chunk_durations else None
            initial_eta = avg_chunk * max(0, effective_total - chunks_done) if avg_chunk is not None else None
            _emit_progress(20 + 75 * (chunks_done / effective_total), f"{chunk_label} · Encode VAE", initial_eta)
            _log(f"   → Bắt đầu {chunk_label} ({len(in_buf)}f)...")
            t_chunk = time.monotonic()

            def _report_step(done: int, total: int, step_elapsed: float) -> None:
                chunk_frac = 0.85 * (done / total)
                overall = min(1.0, (chunks_done + chunk_frac) / effective_total)
                chunk_elapsed = time.monotonic() - t_chunk
                if chunk_durations:
                    avg_s = sum(chunk_durations) / len(chunk_durations)
                    rem_curr = max(0.0, avg_s - chunk_elapsed)
                    eta = rem_curr + max(0, effective_total - chunks_done - 1) * avg_s
                else:
                    est_chunk1 = (step_elapsed / done) * total * 1.25
                    rem_curr = max(0.0, est_chunk1 - chunk_elapsed)
                    eta = rem_curr + max(0, effective_total - 1) * est_chunk1
                _emit_progress(20 + 75 * overall, f"{chunk_label} · Step {done}/{total}", eta)

            curr = _run_wan_chunk(
                pipe,
                prompt_embeds,
                in_buf,
                work_w=work_w,
                work_h=work_h,
                steps=wan_steps,
                strength=strength,
                seed=seed + chunk_idx,
                chunk_label=chunk_label,
                on_step_progress=_report_step,
            )
            chunk_elapsed = time.monotonic() - t_chunk
            chunk_durations.append(chunk_elapsed)
            state["chunks_done"] = chunks_done + 1
            avg_s = sum(chunk_durations) / len(chunk_durations)
            rem_eta = max(0, effective_total - state["chunks_done"]) * avg_s
            _emit_progress(
                20 + 75 * min(1.0, state["chunks_done"] / effective_total),
                f"Xong {chunk_label}",
                rem_eta,
            )
            _log(f"   ✓ Xong {chunk_label} trong {chunk_elapsed:.1f}s")

            if out_tail is not None and overlap > 0:
                blend_len = min(overlap, len(curr), len(out_tail))
                blended = (
                    out_tail[:blend_len].astype(np.float32) * fade_out[:blend_len]
                    + curr[:blend_len].astype(np.float32) * fade_in[:blend_len]
                )
                curr[:blend_len] = np.clip(np.rint(blended), 0, 255).astype(np.uint8)

            emit = curr if next_peek is None else curr[:step]
            encoder.stdin.write(emit.tobytes())
            written += len(emit)

            if next_peek is None:
                break
            in_tail = in_buf[step:]
            out_tail = curr[step:].copy()
            del in_buf, curr
            peek = next_peek
            chunk_idx += 1

        encoder.stdin.close()
        rc = encoder.wait()
        if rc != 0:
            err = encoder.stderr.read().decode(errors="replace") if encoder.stderr else ""
            raise RuntimeError(f"FFmpeg encode thất bại (exit {rc}): {err.strip()}")
        staged.replace(destination)
        _log(f"Đã lưu ({written} frames, {time.monotonic() - t_video:.1f}s): {destination.name}")
    except Exception:
        with suppress(Exception):
            encoder.kill()
            encoder.wait()
        if staged.exists():
            staged.unlink()
        raise


def clean_with_synthid(sources: list[Path], output_dir: Path, cleaned_dir: Path, *, is_standalone: bool) -> None:
    """Fallback 2D VAE SynthID runner using remove-ai-watermarks==0.75.0."""
    cleaner = ensure_synthid_cleaner()
    for source in sources:
        relative = Path(source.name) if is_standalone else source.relative_to(output_dir)
        destination = cleaned_dir / relative
        destination.parent.mkdir(parents=True, exist_ok=True)
        _, _, source_fps, _ = probe_video(source)
        _log(f"Đang xử lý synthid: {relative} ({float(source_fps):g} → {float(min(source_fps, MAX_FPS)):g} fps)")
        fps_options = ["--keep-fps"] if source_fps <= MAX_FPS else ["--fps", str(MAX_FPS)]
        device = ["--device", "cuda"] if is_standalone else []
        subprocess.run(
            [
                cleaner,
                "video",
                "invisible",
                str(source),
                "--profile",
                "synthid",
                "--long-side",
                "1920",
                *fps_options,
                *device,
                "-o",
                str(destination),
            ],
            check=True,
        )
        _log(f"Đã lưu: {destination.relative_to(output_dir)}")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output-dir", required=True, type=Path)
    parser.add_argument("--inputs", nargs="+", type=Path)
    parser.add_argument("--profile", choices=("synthid", "wan21-synthid"), default="wan21-synthid")
    parser.add_argument("--wan-steps", type=int, default=WAN21_DEFAULT_STEPS)
    parser.add_argument("--wan-max-side", type=int, default=WAN21_DEFAULT_MAX_SIDE)
    parser.add_argument("--wan-strength", type=float, default=WAN21_STRENGTH)
    parser.add_argument("--seed", type=int, default=0)
    args = parser.parse_args()
    if args.wan_steps < 1:
        raise ValueError("--wan-steps phải >= 1")
    if args.wan_max_side < 0:
        raise ValueError("--wan-max-side phải >= 0")

    output_dir = args.output_dir.resolve()
    cleaned_dir = output_dir / "aigc-cleaned"
    sources = args.inputs or sorted(
        path for path in output_dir.rglob("*")
        if path.is_file() and path.suffix.lower() == ".mp4" and cleaned_dir not in path.parents
    )
    if not sources:
        _log(f"Không tìm thấy MP4 trong {output_dir}; bỏ qua bước xoá watermark.")
        return 0

    cleaned_dir.mkdir(parents=True, exist_ok=True)
    if args.profile == "synthid":
        clean_with_synthid(sources, output_dir, cleaned_dir, is_standalone=bool(args.inputs))
        return 0

    ensure_wan_dependencies()
    total_chunks = sum(estimate_video_chunks(src, max_side=args.wan_max_side)[-1] for src in sources)
    progress_state: dict[str, Any] = {
        "chunk_durations": [],
        "chunks_done": 0,
        "total_chunks": max(1, total_chunks),
    }
    pipe, prompt_embeds = load_wan_pipeline(vae_bf16=True)
    try:
        for index, source in enumerate(sources, start=1):
            relative = Path(source.name) if args.inputs else source.relative_to(output_dir)
            destination = cleaned_dir / relative
            clean_video_wan(
                source,
                destination,
                pipe=pipe,
                prompt_embeds=prompt_embeds,
                wan_steps=args.wan_steps,
                max_side=args.wan_max_side,
                strength=args.wan_strength,
                seed=args.seed,
                video_index=index,
                total_videos=len(sources),
                progress_state=progress_state,
            )
        _emit_progress(95, "Hoàn tất render, chuẩn bị tải về local", 0)
    finally:
        del pipe, prompt_embeds
        with suppress(Exception):
            import torch

            torch.cuda.empty_cache()
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except subprocess.CalledProcessError as error:
        print(f"Lệnh xoá watermark thất bại (exit {error.returncode}).", file=sys.stderr)
        raise SystemExit(error.returncode or 1)
    except Exception as error:
        print(f"Lỗi bước xoá watermark AIGC: {error}", file=sys.stderr)
        raise SystemExit(1)
