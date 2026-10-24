"""Local editor for OsaurusAI/Qwen-Image-2.1-Turbo-mflux-6bit.

Run from this directory:

    uv run python app.py

Then open http://127.0.0.1:5050
"""

from __future__ import annotations

import gc
import os
import queue
import threading
import time
import traceback
import uuid
import zipfile
from io import BytesIO
from pathlib import Path

from flask import Flask, jsonify, render_template, request, send_file
from PIL import Image, ImageOps, UnidentifiedImageError
from werkzeug.exceptions import RequestEntityTooLarge
from werkzeug.utils import secure_filename

ROOT = Path(__file__).resolve().parent
MODEL_DIR = Path(
    os.environ.get(
        "QWEN_MODEL_DIR",
        ROOT / "models" / "Qwen-Image-2.1-Turbo-mflux-6bit",
    )
)
UPLOAD_DIR = ROOT / "uploads"
OUTPUT_DIR = ROOT / "outputs"
# Budget for the reference image the vision encoder sees. The saved edit uses the upload's own pixels.
OUTPUT_RESOLUTION = 1024
HOST = "127.0.0.1"
PORT = 5050
MAX_IMAGES = 40
MAX_IMAGE_BYTES = 32 * 1024 * 1024
MAX_UPLOAD_BYTES = 512 * 1024 * 1024

UPLOAD_DIR.mkdir(exist_ok=True)
OUTPUT_DIR.mkdir(exist_ok=True)

app = Flask(__name__)
app.config["MAX_CONTENT_LENGTH"] = MAX_UPLOAD_BYTES

_lock = threading.Lock()
_cancel = threading.Event()
_jobs: queue.Queue[dict] = queue.Queue()
_state = {
    "phase": "starting",
    "message": "Starting.",
    "step": 0,
    "total": 8,
    "prompt": "",
    "seed": None,
    "batch_index": 0,
    "batch_count": 0,
    "output_dir": "",
    "items": [],
}


def _set(**fields) -> None:
    with _lock:
        _state.update(fields)


def _snapshot() -> dict:
    with _lock:
        current = dict(_state)
        current["items"] = [dict(item) for item in _state["items"]]
        return current


def _update_item(item_id: str, **fields) -> None:
    with _lock:
        for item in _state["items"]:
            if item["id"] == item_id:
                item.update(fields)
                return


def _batch_outcome(items: list[dict]) -> tuple[str, str]:
    done = sum(item["phase"] == "done" for item in items)
    failed = sum(item["phase"] == "error" for item in items)
    aborted = sum(item["phase"] == "aborted" for item in items)
    if aborted and not done and not failed:
        return "aborted", "Aborted."
    if aborted:
        message = f"Stopped. {done} edited, {aborted} skipped."
        if failed:
            message += f" {failed} failed."
        return "aborted", message
    if failed and done:
        return "done", f"Finished. {done} edited, {failed} failed."
    if failed:
        if len(items) == 1:
            return "error", items[0]["message"] or "Generation failed."
        return "error", f"Failed on all {failed} images."
    if len(items) == 1:
        return "done", "Done."
    return "done", f"Done. {done} images."


def _finish_batch() -> None:
    items = _snapshot()["items"]
    phase, message = _batch_outcome(items)
    _cancel.clear()
    _set(phase=phase, message=message, step=8, total=8, batch_index=len(items), batch_count=len(items))


class _AbortCallback:
    """Stop between denoising steps. A Metal step already running finishes first."""

    def call_before_loop(self, **_kwargs) -> None:
        self._raise_if_cancelled(0)

    def call_in_loop(self, t, config, **_kwargs) -> None:
        step = int(t) + 1
        total = int(config.num_inference_steps)
        step_message = f"Step {step} of {total}."
        with _lock:
            index = _state["batch_index"]
            count = _state["batch_count"]
            for item in _state["items"]:
                if item["phase"] == "running":
                    item["message"] = step_message
                    break
        message = f"Image {index} of {count}. {step_message}" if count > 1 else step_message
        _set(phase="running", step=step, total=total, message=message)
        self._raise_if_cancelled(step)

    @staticmethod
    def _raise_if_cancelled(step: int) -> None:
        if not _cancel.is_set():
            return
        from mflux.utils.exceptions import StopImageGenerationException

        raise StopImageGenerationException(f"Aborted after step {step}.")


_SHARDS = (
    "transformer/0.safetensors",
    "transformer/1.safetensors",
    "transformer/2.safetensors",
    "text_encoder/0.safetensors",
    "text_encoder/1.safetensors",
    "text_encoder/2.safetensors",
    "text_encoder/3.safetensors",
    "vae/0.safetensors",
    "transformer/config.json",
    "text_encoder/config.json",
    "vae/config.json",
    "processor/tokenizer_config.json",
)


def _weights_ready(path: Path) -> bool:
    return all((path / relative).is_file() and (path / relative).stat().st_size > 0 for relative in _SHARDS)


def _worker() -> None:
    import time

    while not _weights_ready(MODEL_DIR):
        _set(
            phase="missing",
            message="Downloading the 6-bit model. The form unlocks when the files are in place.",
        )
        time.sleep(3)

    _set(phase="loading", message="Loading the 6-bit model into memory. This takes a few minutes.")
    try:
        import mlx.core as mx
        from mflux.models.common.config import ModelConfig
        from mflux.models.qwen21.variants.edit.qwen_image_21_edit import QwenImage21Edit
        from mflux.utils.exceptions import StopImageGenerationException

        model = QwenImage21Edit(
            model_path=str(MODEL_DIR),
            model_config=ModelConfig.qwen_image_21_turbo(),
        )
        model.callbacks.register(_AbortCallback())
    except Exception as exc:
        _set(phase="failed", message=f"The model failed to load: {exc}")
        traceback.print_exc()
        return

    _set(phase="ready", message="Ready.", step=0, total=8, batch_index=0, batch_count=0, output_dir="", items=[])
    while True:
        job = _jobs.get()
        try:
            if _cancel.is_set():
                _update_item(job["id"], phase="aborted", message="Skipped.")
                _set(
                    message=f"Skipping image {job['batch_index']} of {job['batch_count']}.",
                    batch_index=job["batch_index"],
                    batch_count=job["batch_count"],
                )
                continue
            _run_job(model, job)
        except StopImageGenerationException as exc:
            _update_item(job["id"], phase="aborted", message=str(exc))
        except Exception as exc:
            _update_item(job["id"], phase="error", message=f"Generation failed: {exc}")
            traceback.print_exc()
        finally:
            try:
                mx.clear_cache()
            except Exception:
                pass
            gc.collect()
            if job["batch_index"] == job["batch_count"]:
                _finish_batch()


def _run_job(model, job: dict) -> None:
    count = job["batch_count"]
    index = job["batch_index"]
    reading = "Reading the photo and the prompt."
    if count > 1:
        reading = f"Image {index} of {count}. {reading}"
    _update_item(job["id"], phase="running", message="Reading the photo and the prompt.")
    _set(
        phase="running",
        message=reading,
        step=0,
        total=8,
        prompt=job["prompt"],
        seed=job["seed"],
        batch_index=index,
        batch_count=count,
    )
    original_size = tuple(job["size"])
    canvas = _canvas_size(*original_size)
    generated = model.generate_image(
        seed=job["seed"],
        prompt=job["prompt"],
        image_paths=[job["image"]],
        num_inference_steps=8,
        guidance=1.0,
        width=canvas[0],
        height=canvas[1],
        output_resolution=OUTPUT_RESOLUTION,
        use_kv_cache=True,
    )
    destination = OUTPUT_DIR / job["output_dir"] / f"{job['id']}.png"
    edited = generated.image
    if edited.size != original_size:
        edited = edited.resize(original_size, Image.Resampling.LANCZOS)
    generated.save_with_image(destination, edited, export_json_metadata=False)
    _update_item(job["id"], phase="done", message="Done.")


def _new_output_dir() -> Path:
    """One folder per Generate click, named with the unix timestamp."""
    stamp = int(time.time())
    folder = OUTPUT_DIR / str(stamp)
    while folder.exists():
        stamp += 1
        folder = OUTPUT_DIR / str(stamp)
    folder.mkdir(parents=True)
    return folder


def _result_path(output_dir: str, item_id: str) -> Path | None:
    if not output_dir.isdigit() or not item_id.isalnum():
        return None
    path = (OUTPUT_DIR / output_dir / f"{item_id}.png").resolve()
    if path.parent != (OUTPUT_DIR / output_dir).resolve() or not path.is_file():
        return None
    return path


def _canvas_size(width: int, height: int) -> tuple[int, int]:
    """Nearest canvas Qwen-Image-2.1 can emit. Both sides must be multiples of 32."""

    def snap(value: int) -> int:
        return max(32, ((value + 16) // 32) * 32)

    return snap(width), snap(height)


def _display_name(filename: str | None) -> str:
    name = Path(filename or "").name.strip()
    return name or "image"


def _download_name(original: str, used: set[str]) -> str:
    stem = secure_filename(Path(original).stem) or "image"
    candidate = f"{stem}-edited.png"
    number = 2
    while candidate in used:
        candidate = f"{stem}-{number}-edited.png"
        number += 1
    used.add(candidate)
    return candidate


def _save_upload(file_storage) -> tuple[Path, tuple[int, int]]:
    label = _display_name(file_storage.filename if file_storage is not None else None)
    if file_storage is None or not file_storage.filename:
        raise ValueError("Choose an image first.")
    raw = file_storage.read()
    if not raw:
        raise ValueError(f"{label} is empty.")
    if len(raw) > MAX_IMAGE_BYTES:
        raise ValueError(f"{label} is larger than 32 MB.")
    stored = secure_filename(file_storage.filename) or "upload"
    destination = (UPLOAD_DIR / f"{uuid.uuid4().hex}-{stored}").with_suffix(".png")
    try:
        image = Image.open(BytesIO(raw))
        image = ImageOps.exif_transpose(image).convert("RGBA")
        image.save(destination, format="PNG")
    except (UnidentifiedImageError, OSError) as exc:
        destination.unlink(missing_ok=True)
        raise ValueError(f"{label} is not a readable image.") from exc
    return destination, image.size


@app.get("/")
def index():
    return render_template("index.html")


def _public_item(item: dict) -> dict:
    done = item["phase"] == "done"
    return {
        "id": item["id"],
        "name": item["name"],
        "phase": item["phase"],
        "seed": item["seed"],
        "message": item["message"],
        "result_url": f"/api/result/{item['id']}" if done else None,
    }


@app.get("/api/status")
def status():
    current = _snapshot()
    return jsonify(
        {
            "phase": current["phase"],
            "message": current["message"],
            "step": current["step"],
            "total": current["total"],
            "prompt": current["prompt"],
            "seed": current["seed"],
            "batch_index": current["batch_index"],
            "batch_count": current["batch_count"],
            "output_dir": current["output_dir"],
            "items": [_public_item(item) for item in current["items"]],
        }
    )


def _incoming_images():
    files = [item for item in request.files.getlist("images") if item and item.filename]
    if not files:
        files = [item for item in request.files.getlist("image") if item and item.filename]
    return files


@app.post("/api/generate")
def generate():
    prompt = (request.form.get("prompt") or "").strip()
    if not prompt:
        return jsonify({"error": "Write a prompt first."}), 400
    files = _incoming_images()
    if not files:
        return jsonify({"error": "Choose an image first."}), 400
    if len(files) > MAX_IMAGES:
        return jsonify({"error": f"Choose {MAX_IMAGES} images or fewer."}), 400

    saved: list[Path] = []
    items = []
    jobs = []
    try:
        for storage in files:
            image_path, image_size = _save_upload(storage)
            saved.append(image_path)
            item_id = uuid.uuid4().hex
            items.append(
                {
                    "id": item_id,
                    "name": _display_name(storage.filename),
                    "phase": "pending",
                    "seed": int.from_bytes(os.urandom(4), "big"),
                    "message": "Waiting.",
                }
            )
            jobs.append(
                {
                    "id": item_id,
                    "prompt": prompt,
                    "image": str(image_path),
                    "size": image_size,
                    "seed": items[-1]["seed"],
                    "batch_index": len(items),
                    "batch_count": 0,
                }
            )
    except ValueError as exc:
        for path in saved:
            path.unlink(missing_ok=True)
        return jsonify({"error": str(exc)}), 400

    count = len(jobs)
    for job in jobs:
        job["batch_count"] = count
    queued = f"Queued {count} images." if count > 1 else "Queued."
    with _lock:
        if _state["phase"] in {"running", "loading", "starting"}:
            for path in saved:
                path.unlink(missing_ok=True)
            return jsonify({"error": "A generation is already in progress."}), 409
        if _state["phase"] not in {"ready", "done", "aborted", "error"}:
            for path in saved:
                path.unlink(missing_ok=True)
            return jsonify({"error": _state["message"] or "The model is not ready."}), 503
        _cancel.clear()
        output_dir = _new_output_dir()
        for job in jobs:
            job["output_dir"] = output_dir.name
        _state.update(
            phase="running",
            message=queued,
            step=0,
            total=8,
            prompt=prompt,
            seed=jobs[0]["seed"],
            batch_index=1,
            batch_count=count,
            output_dir=output_dir.name,
            items=items,
        )
    for job in jobs:
        _jobs.put(job)
    return jsonify({"ok": True, "count": count}), 202


@app.post("/api/abort")
def abort():
    current = _snapshot()
    if current["phase"] != "running":
        return jsonify({"ok": False, "message": "Nothing is generating."})
    _cancel.set()
    count = current["batch_count"]
    message = "Stopping this image and skipping the rest." if count > 1 else "Stopping after the current step."
    _set(message=message)
    return jsonify({"ok": True})


@app.get("/api/batch.zip")
def batch_zip():
    current = _snapshot()
    if current["phase"] == "running":
        return jsonify({"error": "The batch is still running."}), 409
    done = [item for item in current["items"] if item["phase"] == "done"]
    if not done:
        return jsonify({"error": "No edited images yet."}), 404
    folder = str(current.get("output_dir") or "")
    buffer = BytesIO()
    used: set[str] = set()
    with zipfile.ZipFile(buffer, "w", compression=zipfile.ZIP_STORED) as archive:
        for item in done:
            path = _result_path(folder, item["id"])
            if path is None:
                return jsonify({"error": "An edited image is missing."}), 404
            archive.write(path, _download_name(item["name"], used))
    buffer.seek(0)
    return send_file(
        buffer,
        mimetype="application/zip",
        as_attachment=True,
        download_name=f"{folder}.zip",
    )


@app.get("/api/result/<result_id>")
def result(result_id: str):
    current = _snapshot()
    path = _result_path(str(current.get("output_dir") or ""), result_id)
    if path is None:
        return jsonify({"error": "Result not ready."}), 404
    return send_file(path, mimetype="image/png")


@app.errorhandler(RequestEntityTooLarge)
def too_large(_exc):
    return jsonify({"error": "Upload is larger than 512 MB."}), 413


def main() -> None:
    threading.Thread(target=_worker, name="qwen-worker", daemon=True).start()
    app.run(host=HOST, port=PORT, debug=False, use_reloader=False, threaded=True)


if __name__ == "__main__":
    main()
