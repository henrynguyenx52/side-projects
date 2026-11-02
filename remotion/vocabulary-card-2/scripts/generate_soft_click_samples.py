#!/usr/bin/env python3
"""
Generate soft_click samples for "Did she [CLICK - CLICK] you the truth?"
"""

import subprocess
from pathlib import Path
import numpy as np
import soundfile as sf
from scipy.signal import resample_poly

PROJECT_DIR = Path(__file__).resolve().parent.parent
SIDE_PROJECTS_DIR = PROJECT_DIR.parent.parent
SAMPLES_DIR = PROJECT_DIR / "public" / "audio" / "soft-click-samples"
SAMPLES_DIR.mkdir(parents=True, exist_ok=True)

TEMP_DIR = Path("/tmp/soft_click_tmp")
TEMP_DIR.mkdir(parents=True, exist_ok=True)

# Load Kokoro speech
speech_dir = Path("/tmp/blank_samples_tmp")
did_she, sr = sf.read(str(speech_dir / "did_she.wav"))
you_truth, _ = sf.read(str(speech_dir / "you_the_truth.wav"))

if sr != 48000:
    did_she = resample_poly(did_she, 48000, sr).astype(np.float32)
    you_truth = resample_poly(you_truth, 48000, sr).astype(np.float32)

def trim_audio(audio, threshold=0.01):
    idx = np.where(np.abs(audio) > threshold)[0]
    if len(idx) == 0:
        return audio
    start = max(0, idx[0] - 1200)
    end = min(len(audio), idx[-1] + 1200)
    return audio[start:end]

did_she = trim_audio(did_she)
you_truth = trim_audio(you_truth)

click_soft_path = SIDE_PROJECTS_DIR / "hyperframes/skills/media-use/audio/assets/sfx/click-soft.mp3"
click_standard_path = SIDE_PROJECTS_DIR / "hyperframes/skills/media-use/audio/assets/sfx/click.mp3"

def load_click(path_in, pitch_factor=1.0, duration=0.15):
    out_wav = TEMP_DIR / f"click_{Path(path_in).stem}_{pitch_factor}.wav"
    filter_chain = f"asetrate=48000*{pitch_factor},aresample=48000"
    subprocess.run([
        "ffmpeg", "-y", "-i", str(path_in),
        "-af", filter_chain,
        "-ac", "1", "-ar", "48000",
        "-t", str(duration),
        str(out_wav)
    ], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=True)
    data, _ = sf.read(str(out_wav))
    return data.astype(np.float32)

# Build double click
def build_double(s1, s2, spacing_ms=130):
    spacing_samples = int((spacing_ms / 1000.0) * 48000)
    total_len = spacing_samples + len(s2)
    combined = np.zeros(total_len, dtype=np.float32)
    combined[:len(s1)] += s1
    combined[spacing_samples:spacing_samples + len(s2)] += s2
    peak = np.max(np.abs(combined))
    if peak > 0.95:
        combined = combined * (0.95 / peak)
    return combined

c_soft = load_click(click_soft_path, pitch_factor=1.0) * 0.95
c_soft_hi = load_click(click_soft_path, pitch_factor=1.15) * 0.95
c_std = load_click(click_standard_path, pitch_factor=1.0) * 0.90

samples = [
    {
        "file": "1_double_soft_click_natural.wav",
        "name": "Two Soft Clicks (Natural Timing - 130ms)",
        "desc": "Two gentle, muted wooden clicks spaced naturally ('click ... click'). Very subtle and unobtrusive.",
        "sfx": build_double(c_soft, c_soft, spacing_ms=130)
    },
    {
        "file": "2_double_soft_click_quick.wav",
        "name": "Two Soft Clicks (Quick Double-Tap - 85ms)",
        "desc": "A brisk haptic double-tap ('click-click'). Feels like a snappy modern UI toggle.",
        "sfx": build_double(c_soft, c_soft, spacing_ms=85)
    },
    {
        "file": "3_double_soft_click_inflection.wav",
        "name": "Two Soft Clicks (Gentle Rising Pitch)",
        "desc": "Two soft clicks where the 2nd click has a slightly higher pitch ('click - click↗'). Adds a questioning tone.",
        "sfx": build_double(c_soft, c_soft_hi, spacing_ms=120)
    }
]

pause_gap = np.zeros(int(0.08 * 48000), dtype=np.float32)

for s in samples:
    combined = np.concatenate([
        did_she,
        pause_gap,
        s["sfx"],
        pause_gap,
        you_truth
    ])
    out_file = SAMPLES_DIR / s["file"]
    sf.write(str(out_file), combined, 48000)
    print(f"Generated: {s['file']}")

print(f"\nSoft click samples generated successfully in: {SAMPLES_DIR}")

