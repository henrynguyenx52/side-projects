#!/usr/bin/env python3
"""Benchmark harness for local SoulX-FlashHead Lite inference.

The actual pipeline is intentionally supplied by the checked-out fork. This
script measures a callable command, synchronizes MPS where available, and
records timing metadata without inventing model results.
"""
from __future__ import annotations

import argparse, json, os, platform, subprocess, sys, time
from pathlib import Path

def mps_sync() -> None:
    try:
        import torch
        if hasattr(torch, "mps") and torch.backends.mps.is_available():
            torch.mps.synchronize()
    except Exception:
        pass

def run_once(command: list[str]) -> float:
    mps_sync(); start = time.perf_counter()
    subprocess.run(command, check=True)
    mps_sync(); return time.perf_counter() - start

def main() -> None:
    p = argparse.ArgumentParser()
    p.add_argument("--audio-duration", type=float, required=True)
    p.add_argument("--frames", type=int, required=True)
    p.add_argument("--command", nargs=argparse.REMAINDER, required=True)
    p.add_argument("--warmups", type=int, default=2)
    p.add_argument("--trials", type=int, default=3)
    p.add_argument("--output", default="results/benchmark.json")
    a = p.parse_args()
    if not a.command or a.command[0] == "--": p.error("--command must be followed by an inference command")
    for _ in range(a.warmups): run_once(a.command)
    timings = [run_once(a.command) for _ in range(a.trials)]
    timings_sorted = sorted(timings)
    median = timings_sorted[len(timings_sorted)//2]
    result = {
        "status": "measured", "audio_duration_seconds": a.audio_duration,
        "frames": a.frames, "timings_seconds": timings,
        "median_inference_seconds": median,
        "rtf": median / a.audio_duration,
        "effective_generated_fps": a.frames / median,
        "output_fps": a.frames / a.audio_duration,
        "hardware": {"machine": platform.machine(), "system": platform.platform(), "python": sys.version},
        "command": a.command, "warmups": a.warmups, "trials": a.trials,
        "note": "Command timing includes the command's own preprocessing/encoding; instrument pipeline stages separately for pure inference.",
    }
    out = Path(a.output); out.parent.mkdir(parents=True, exist_ok=True); out.write_text(json.dumps(result, indent=2) + "\n")
    print(json.dumps(result, indent=2))

if __name__ == "__main__": main()
