from __future__ import annotations

import threading
import time
import uuid
from dataclasses import dataclass, field
from typing import Any, Callable, Dict, Optional

from app.flux import EditCancelled, ProgressEvent, stop_process

ACTIVE = {"running", "cancelling"}


@dataclass
class Timings:
    load_seconds: float = 6.0
    step_seconds: float = 4.5
    finish_seconds: float = 1.0


@dataclass
class Job:
    total_steps: int
    image_count: int = 1
    image_index: int = 1
    image_step: Optional[int] = None
    image_steps: Optional[int] = None
    id: str = field(default_factory=lambda: uuid.uuid4().hex)
    status: str = "running"
    phase: str = "Starting"
    step: Optional[int] = None
    started_at: float = field(default_factory=time.monotonic)
    sampling_started_at: Optional[float] = None
    step_started_at: Optional[float] = None
    finishing_started_at: Optional[float] = None
    finished_at: Optional[float] = None
    error: Optional[str] = None
    result: Optional[Dict[str, Any]] = None
    cancel_requested: bool = False
    process: Any = None


def record_progress(job: Job, event: ProgressEvent, now: float) -> None:
    job.phase = event.phase
    if event.total:
        job.total_steps = event.total
    if event.phase == "Sampling" and event.step and event.step != job.step:
        if job.sampling_started_at is None:
            job.sampling_started_at = now
        job.step = event.step
        job.step_started_at = now
    elif event.phase in ("Finishing", "Generated") and job.finishing_started_at is None:
        job.finishing_started_at = now


def estimate_remaining(job: Job, timings: Timings, now: float) -> float:
    steps = max(job.total_steps, 1)
    if job.finishing_started_at is not None:
        return max(timings.finish_seconds - (now - job.finishing_started_at), 0.5)
    if job.step is None or job.step_started_at is None or job.sampling_started_at is None:
        loading_left = max(timings.load_seconds - (now - job.started_at), 1.0)
        return loading_left + steps * timings.step_seconds + timings.finish_seconds
    if job.step >= 2:
        step_seconds = (job.step_started_at - job.sampling_started_at) / (job.step - 1)
    else:
        step_seconds = timings.step_seconds
    current_left = max(step_seconds - (now - job.step_started_at), 0.5)
    return current_left + (steps - job.step) * step_seconds + timings.finish_seconds


class JobManager:
    def __init__(self, clock: Callable[[], float] = time.monotonic) -> None:
        self._clock = clock
        self._lock = threading.Lock()
        self._jobs: Dict[str, Job] = {}
        self.timings = Timings()

    def active(self) -> Optional[Job]:
        with self._lock:
            return next((job for job in self._jobs.values() if job.status in ACTIVE), None)

    def get(self, job_id: str) -> Optional[Job]:
        with self._lock:
            return self._jobs.get(job_id)

    def submit(
        self,
        total_steps: int,
        work: Callable[..., Dict[str, Any]],
        cleanup: Callable[[], None],
        image_count: int = 1,
    ) -> Job:
        with self._lock:
            if any(job.status in ACTIVE for job in self._jobs.values()):
                raise RuntimeError("Another edit is already running. Abort it or wait for it to finish.")
            job = Job(total_steps=total_steps, image_count=max(image_count, 1), started_at=self._clock())
            self._jobs[job.id] = job

        def on_progress(event: ProgressEvent) -> None:
            with self._lock:
                record_progress(job, event, self._clock())

        def on_start(process: Any) -> None:
            with self._lock:
                job.process = process

        def set_image(index: int, step: Optional[int] = None, steps: Optional[int] = None) -> None:
            with self._lock:
                if index != job.image_index:
                    job.image_step = None
                    job.phase = "Starting"
                job.image_index = max(index, 1)
                if step is not None:
                    job.image_step = step
                if steps is not None:
                    job.image_steps = steps

        def cancelled() -> bool:
            return job.cancel_requested

        def run() -> None:
            try:
                result = work(
                    on_progress=on_progress,
                    on_start=on_start,
                    cancelled=cancelled,
                    set_image=set_image,
                )
            except EditCancelled as cancelled_error:
                self._finish(job, "cancelled", result=getattr(cancelled_error, "result", None), error="Edit aborted.")
            except Exception as error:
                if job.cancel_requested:
                    self._finish(job, "cancelled", error="Edit aborted.")
                else:
                    self._finish(job, "failed", error=str(error))
            else:
                self._finish(job, "succeeded", result=result)
            finally:
                cleanup()

        threading.Thread(target=run, name=f"edit-{job.id}", daemon=True).start()
        return job

    def cancel(self, job_id: str) -> Optional[Job]:
        with self._lock:
            job = self._jobs.get(job_id)
            if job is None or job.status not in ACTIVE:
                return job
            job.cancel_requested = True
            job.status = "cancelling"
            process = job.process
        if process is not None:
            threading.Thread(target=stop_process, args=(process,), daemon=True).start()
        return job

    def shutdown(self) -> None:
        with self._lock:
            running = [job for job in self._jobs.values() if job.status in ACTIVE]
            for job in running:
                job.cancel_requested = True
        for job in running:
            if job.process is not None:
                stop_process(job.process, grace_seconds=2.0)

    def snapshot(self, job: Job) -> Dict[str, Any]:
        with self._lock:
            now = job.finished_at if job.finished_at is not None else self._clock()
            elapsed = now - job.started_at
            remaining = None
            progress = 1.0 if job.status == "succeeded" else 0.0
            if job.status == "running":
                remaining = estimate_remaining(job, self.timings, now)
                progress = min(elapsed / (elapsed + remaining), 0.99)
            body: Dict[str, Any] = {
                "id": job.id,
                "status": job.status,
                "phase": job.phase,
                "step": job.step,
                "total_steps": job.total_steps,
                "image_index": job.image_index,
                "image_count": job.image_count,
                "image_step": job.image_step,
                "image_steps": job.image_steps,
                "elapsed_seconds": round(elapsed, 1),
                "remaining_seconds": None if remaining is None else round(remaining, 1),
                "progress": round(progress, 3),
                "error": job.error,
            }
            if job.result:
                body.update(job.result)
            return body

    def _finish(self, job: Job, status: str, result: Optional[Dict[str, Any]] = None, error: Optional[str] = None) -> None:
        with self._lock:
            now = self._clock()
            job.status = status
            job.result = result
            job.error = error
            job.finished_at = now
            job.process = None
            if status == "succeeded":
                self._learn(job, now)

    def _learn(self, job: Job, now: float) -> None:
        if job.sampling_started_at is None or job.finishing_started_at is None:
            return
        self.timings = Timings(
            load_seconds=job.sampling_started_at - job.started_at,
            step_seconds=(job.finishing_started_at - job.sampling_started_at) / max(job.total_steps, 1),
            finish_seconds=max(now - job.finishing_started_at, 0.5),
        )
