from __future__ import annotations

import math
import re
import time
import uuid
from contextlib import asynccontextmanager
from dataclasses import dataclass
from pathlib import Path
from urllib.parse import quote

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from PIL import Image, UnidentifiedImageError

from app.flux import (
    DEFAULT_STRENGTH,
    EditCancelled,
    PreparedImage,
    ProgressEvent,
    configured_steps,
    edit_image,
    ensure_ready,
    prepare_image,
    runtime_status,
)
from app.jobs import JobManager

ROOT = Path(__file__).resolve().parent.parent
STATIC_DIR = ROOT / "static"
UPLOAD_DIR = ROOT / "uploads"
OUTPUT_DIR = ROOT / "outputs"
MAX_UPLOAD_BYTES = 15 * 1024 * 1024
MAX_BATCH = 30
_UNSAFE_NAME = re.compile(r"[^\w.-]+", re.UNICODE)

Image.MAX_IMAGE_PIXELS = 40_000_000
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

jobs = JobManager()


class CancelledWithResult(EditCancelled):
    def __init__(self, result: dict) -> None:
        super().__init__()
        self.result = result


@dataclass(frozen=True)
class PreparedEdit:
    source_name: str
    filename: str
    prepared_path: Path
    output_path: Path
    original_width: int
    original_height: int
    canvas_width: int
    canvas_height: int


def output_filename(original: str, used: set[str]) -> str:
    stem = Path(Path(original or "").name).stem
    cleaned = _UNSAFE_NAME.sub("-", stem).strip(".-_")[:80] or "image"
    number = 1
    while True:
        suffix = "" if number == 1 else f"-{number}"
        candidate = f"{cleaned}{suffix}.png"
        if candidate.lower() not in used:
            used.add(candidate.lower())
            return candidate
        number += 1


def create_batch_folder() -> Path:
    for _ in range(50):
        folder = OUTPUT_DIR / str(time.time_ns() // 1_000_000)
        try:
            folder.mkdir()
            return folder
        except FileExistsError:
            time.sleep(0.001)
    raise RuntimeError("Could not create an output folder.")


def scale_progress(event: ProgressEvent, index: int, count: int, steps_each: int) -> tuple[ProgressEvent, int]:
    if event.total:
        steps_each = event.total
    steps_each = max(steps_each, 1)
    batch_total = steps_each * count
    if event.phase in ("Finishing", "Generated") and index < count - 1:
        return ProgressEvent("Sampling", event.percent, (index + 1) * steps_each, batch_total), steps_each
    step = None if event.step is None else index * steps_each + event.step
    total = batch_total if event.total else None
    return ProgressEvent(event.phase, event.percent, step, total), steps_each


@asynccontextmanager
async def lifespan(_: FastAPI):
    yield
    jobs.shutdown()


app = FastAPI(title="Klein Edit", lifespan=lifespan)
app.mount("/outputs", StaticFiles(directory=OUTPUT_DIR), name="outputs")
app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")


@app.get("/")
def index() -> FileResponse:
    return FileResponse(STATIC_DIR / "index.html")


@app.get("/api/status")
def api_status() -> dict:
    return {**runtime_status(), "max_batch": MAX_BATCH}


@app.post("/api/edit", status_code=202)
async def api_edit(
    prompt: str = Form(...),
    image: list[UploadFile] = File(...),
    strength: float = Form(DEFAULT_STRENGTH),
) -> dict:
    if not prompt.strip():
        raise HTTPException(status_code=400, detail="Enter an edit instruction.")
    if not 0 < strength <= 1:
        raise HTTPException(status_code=400, detail="Edit strength must be greater than 0 and at most 1.")
    if not image:
        raise HTTPException(status_code=400, detail="Choose an image to edit.")
    if len(image) > MAX_BATCH:
        raise HTTPException(status_code=400, detail=f"Upload at most {MAX_BATCH} images at a time.")
    if jobs.active() is not None:
        raise HTTPException(status_code=409, detail="Another edit is already running. Abort it or wait for it to finish.")

    temp_paths: list[Path] = []
    pending: list[tuple[str, Path, PreparedImage]] = []

    def remove_temps() -> None:
        for path in temp_paths:
            path.unlink(missing_ok=True)

    try:
        for upload in image:
            source_name = Path(upload.filename or "image").name or "image"
            payload = await upload.read()
            if not payload:
                remove_temps()
                raise HTTPException(status_code=400, detail=f"{source_name} is empty. Choose an image to edit.")
            if len(payload) > MAX_UPLOAD_BYTES:
                remove_temps()
                raise HTTPException(status_code=400, detail=f"{source_name} must be 15 MB or smaller.")

            token = uuid.uuid4().hex
            upload_path = UPLOAD_DIR / f"{token}-source"
            prepared_path = UPLOAD_DIR / f"{token}.png"
            temp_paths.extend((upload_path, prepared_path))
            upload_path.write_bytes(payload)
            try:
                prepared = prepare_image(upload_path, prepared_path)
            except UnidentifiedImageError as error:
                remove_temps()
                raise HTTPException(
                    status_code=400,
                    detail=f"{source_name} is not a PNG, JPEG, or WebP image.",
                ) from error
            except ValueError as error:
                remove_temps()
                raise HTTPException(status_code=400, detail=f"{source_name}: {error}") from error
            pending.append((source_name, prepared_path, prepared))
        ensure_ready()
    except RuntimeError as error:
        remove_temps()
        raise HTTPException(status_code=503, detail=str(error)) from error

    try:
        batch_dir = create_batch_folder()
    except RuntimeError as error:
        remove_temps()
        raise HTTPException(status_code=500, detail=str(error)) from error

    used_names: set[str] = set()
    edits: list[PreparedEdit] = []
    for source_name, prepared_path, prepared in pending:
        filename = output_filename(source_name, used_names)
        edits.append(
            PreparedEdit(
                source_name=source_name,
                filename=filename,
                prepared_path=prepared_path,
                output_path=batch_dir / filename,
                original_width=prepared.original_width,
                original_height=prepared.original_height,
                canvas_width=prepared.canvas_width,
                canvas_height=prepared.canvas_height,
            )
        )

    def cleanup() -> None:
        remove_temps()
        try:
            batch_dir.rmdir()
        except OSError:
            pass

    def result_body(images_out: list[dict], failures: list[dict]) -> dict:
        first = images_out[0]
        body = {
            "folder": batch_dir.name,
            "images": images_out,
            "image_url": first["image_url"],
            "width": first["width"],
            "height": first["height"],
            "seed": first["seed"],
            "model": first["model"],
        }
        if failures:
            body["failures"] = failures
        return body

    def work(**callbacks) -> dict:
        images_out: list[dict] = []
        failures: list[dict] = []
        counted = {"steps": max(1, math.ceil(configured_steps() * strength))}

        for index, edit in enumerate(edits):
            if callbacks["cancelled"]():
                if images_out:
                    raise CancelledWithResult(result_body(images_out, failures))
                raise EditCancelled()
            callbacks["set_image"](index + 1)

            def on_progress(event: ProgressEvent, index: int = index) -> None:
                callbacks["set_image"](index + 1, event.step, event.total or counted["steps"])
                scaled, counted["steps"] = scale_progress(event, index, len(edits), counted["steps"])
                callbacks["on_progress"](scaled)

            try:
                result = edit_image(
                    edit.prepared_path,
                    prompt.strip(),
                    edit.output_path,
                    strength,
                    edit.canvas_width,
                    edit.canvas_height,
                    original_size=(edit.original_width, edit.original_height),
                    on_progress=on_progress,
                    on_start=callbacks["on_start"],
                    cancelled=callbacks["cancelled"],
                )
            except EditCancelled:
                edit.output_path.unlink(missing_ok=True)
                if images_out:
                    raise CancelledWithResult(result_body(images_out, failures))
                raise
            except Exception as error:
                edit.output_path.unlink(missing_ok=True)
                failures.append({"source_name": edit.source_name, "error": str(error)})
                continue

            images_out.append(
                {
                    "filename": edit.filename,
                    "source_name": edit.source_name,
                    "image_url": f"/outputs/{batch_dir.name}/{quote(edit.filename)}",
                    "width": result["width"],
                    "height": result["height"],
                    "seed": result["seed"],
                    "model": result["model"],
                }
            )

        if not images_out:
            failed = failures[0]
            raise RuntimeError(f"{failed['source_name']}: {failed['error']}" if failed else "The edit failed.")
        return result_body(images_out, failures)

    steps_each = max(1, math.ceil(configured_steps() * strength))
    try:
        job = jobs.submit(steps_each * len(edits), work, cleanup, image_count=len(edits))
    except RuntimeError as error:
        cleanup()
        raise HTTPException(status_code=409, detail=str(error)) from error
    return jobs.snapshot(job)


@app.get("/api/jobs/{job_id}")
def api_job(job_id: str) -> dict:
    job = jobs.get(job_id)
    if job is None:
        raise HTTPException(status_code=404, detail="Edit not found.")
    return jobs.snapshot(job)


@app.post("/api/jobs/{job_id}/cancel")
def api_cancel(job_id: str) -> JSONResponse:
    job = jobs.cancel(job_id)
    if job is None:
        raise HTTPException(status_code=404, detail="Edit not found.")
    return JSONResponse(jobs.snapshot(job), status_code=202 if job.status == "cancelling" else 200)
