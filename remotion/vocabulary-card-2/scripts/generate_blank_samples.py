#!/usr/bin/env python3
"""
Generate sample audio clips for "Did she [SOUND] you the truth?"
testing different natural sounds to replace the spoken word 'blank'.
"""

import os
import sys
from pathlib import Path
import numpy as np
import soundfile as sf
import subprocess

PROJECT_DIR = Path(__file__).resolve().parent.parent
SIDE_PROJECTS_DIR = PROJECT_DIR.parent.parent
SAMPLES_DIR = PROJECT_DIR / "public" / "audio" / "blank-samples"
SAMPLES_DIR.mkdir(parents=True, exist_ok=True)

TEMP_DIR = Path("/tmp/blank_samples_tmp")
TEMP_DIR.mkdir(parents=True, exist_ok=True)

# Step 1: Generate speech chunks with Kokoro: "Did she" and "you the truth?"
kokoro_script = f"""
import soundfile as sf
import torch
from kokoro import KPipeline
from pathlib import Path

pipeline = KPipeline(lang_code="a")

def gen_phrase(text, filename):
    gen = pipeline(text, voice="am_adam", speed=1.0)
    audios = [a for gs, ps, a in gen]
    if audios:
        full = torch.cat(audios, dim=0) if isinstance(audios[0], torch.Tensor) else audios[0]
        if hasattr(full, "numpy"):
            full = full.numpy()
        sf.write("{TEMP_DIR}/" + filename, full, 24000)

gen_phrase("Did she", "did_she.wav")
gen_phrase("you the truth?", "you_the_truth.wav")
print("Generated Did she and you the truth with Kokoro.")
"""

tmp_py = Path("/tmp/run_kokoro_blank.py")
tmp_py.write_text(kokoro_script, encoding="utf-8")

if not (TEMP_DIR / "did_she.wav").exists() or not (TEMP_DIR / "you_the_truth.wav").exists():
    print("Generating voice segments with Kokoro...")
    cmd = f'cd "{SIDE_PROJECTS_DIR / "kokoro"}" && uv run python "{tmp_py}"'
    ret = os.system(cmd)
    if ret != 0:
        raise RuntimeError("Kokoro generation failed")
else:
    print("Voice segments already generated in /tmp/blank_samples_tmp.")

# Load generated speech
did_she, sr_speech = sf.read(str(TEMP_DIR / "did_she.wav"))
you_truth, _ = sf.read(str(TEMP_DIR / "you_the_truth.wav"))

# Resample speech to 48000 Hz if needed
from scipy.signal import resample_poly

if sr_speech != 48000:
    did_she = resample_poly(did_she, 48000, sr_speech).astype(np.float32)
    you_truth = resample_poly(you_truth, 48000, sr_speech).astype(np.float32)

# Trim trailing silence from "Did she" and leading silence from "you the truth"
def trim_audio(audio, threshold=0.01):
    idx = np.where(np.abs(audio) > threshold)[0]
    if len(idx) == 0:
        return audio
    start = max(0, idx[0] - 1200)
    end = min(len(audio), idx[-1] + 1200)
    return audio[start:end]

did_she = trim_audio(did_she)
you_truth = trim_audio(you_truth)

# Function to load and resample any audio effect to 48kHz mono
def load_sfx(path_str):
    p = Path(path_str)
    # Convert to wav via ffmpeg if necessary
    wav_path = TEMP_DIR / f"{p.stem}.wav"
    subprocess.run([
        "ffmpeg", "-y", "-i", str(p), "-ac", "1", "-ar", "48000", str(wav_path)
    ], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=True)
    data, _ = sf.read(str(wav_path))
    return data.astype(np.float32)

# Define candidates
candidates = [
    {
        "id": "1_cartoon_pop",
        "name": "Cartoon Bubble Pop (Duolingo Style)",
        "desc": "Playful, tactile bubble pop — cheerful and light.",
        "path": SIDE_PROJECTS_DIR / "hyperframes/skills/media-use/audio/assets/sfx/pop.mp3",
        "vol": 0.85
    },
    {
        "id": "2_crystal_ping",
        "name": "Crystal Ping / Bell",
        "desc": "Clean, bright, elegant chime tone.",
        "path": SIDE_PROJECTS_DIR / "hyperframes/skills/media-use/audio/assets/sfx/ping.mp3",
        "vol": 0.70
    },
    {
        "id": "3_soft_click",
        "name": "Soft Tactile Tap",
        "desc": "Subtle, organic wooden tap / button press.",
        "path": SIDE_PROJECTS_DIR / "hyperframes/skills/media-use/audio/assets/sfx/click-soft.mp3",
        "vol": 0.95
    },
    {
        "id": "4_melodic_chime",
        "name": "Warm Melodic Chime",
        "desc": "Gentle, friendly educational cue.",
        "path": SIDE_PROJECTS_DIR / "hyperframes/skills/media-use/audio/assets/sfx/chime.mp3",
        "vol": 0.65
    },
    {
        "id": "5_macos_bottle",
        "name": "Warm Water Bottle Plink (macOS Bottle)",
        "desc": "Soft, rounded percussive water drop / bottle tap.",
        "path": Path("/System/Library/Sounds/Bottle.aiff"),
        "vol": 0.85
    },
    {
        "id": "6_retro_blip",
        "name": "Gamified Retro Quiz Blip",
        "desc": "Crisp 0.15s electronic game blip (synthetic).",
        "synthetic": True,
    }
]

pause_gap = np.zeros(int(0.08 * 48000), dtype=np.float32)

for cand in candidates:
    if cand.get("synthetic"):
        # Synthesize a soft cheerful blip at 700Hz with exponential decay
        dur = int(0.16 * 48000)
        t = np.linspace(0, 0.16, dur, endpoint=False)
        envelope = np.exp(-t * 24)
        sfx_data = (np.sin(2 * np.pi * 720 * t) * envelope * 0.45).astype(np.float32)
    else:
        sfx_data = load_sfx(cand["path"]) * cand.get("vol", 0.8)
        # Limit sfx duration so it doesn't linger too long (max 0.45s)
        max_samples = int(0.45 * 48000)
        if len(sfx_data) > max_samples:
            fade_len = int(0.08 * 48000)
            sfx_data = sfx_data[:max_samples]
            sfx_data[-fade_len:] *= np.linspace(1, 0, fade_len)

    # Stitch: [did_she] + [gap] + [sfx] + [gap] + [you_truth]
    combined = np.concatenate([
        did_she,
        pause_gap,
        sfx_data,
        pause_gap,
        you_truth
    ])

    out_file = SAMPLES_DIR / f"{cand['id']}.wav"
    sf.write(str(out_file), combined, 48000)
    print(f"Generated sample: {out_file.name}")

print("\nAll samples generated successfully in:", SAMPLES_DIR)
