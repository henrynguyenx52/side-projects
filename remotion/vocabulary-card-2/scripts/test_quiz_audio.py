#!/usr/bin/env python3
"""
Generate the updated quiz scene audio:
1. "Thử sức nhé!" (Vietnamese Adam)
2. English phrase: "Did she [double soft click] you the truth?"
3. "Say hay Tell? Năm... Bốn... Ba... Hai... Một...! Đáp án là Tell! Vì có you ngay phía sau!" (Vietnamese Adam)
"""

import math
import numpy as np
import soundfile as sf
from pathlib import Path
from vieneu import Vieneu
from scipy.signal import resample_poly

PROJECT_DIR = Path(__file__).resolve().parent.parent
SAMPLES_DIR = PROJECT_DIR / "public" / "audio" / "soft-click-samples"
OUT_DIR = PROJECT_DIR / "public" / "audio" / "say-tell"

print("1. Loading chosen double soft click sound...")
double_click_wav = SAMPLES_DIR / "2_double_soft_click_quick.wav"
en_chunk, sr_en = sf.read(str(double_click_wav))
if sr_en != 48000:
    en_chunk = resample_poly(en_chunk, 48000, sr_en).astype(np.float32)

print(f"English chunk duration: {len(en_chunk)/48000:.3f}s")

print("2. Loading VieNeu-TTS model...")
tts = Vieneu(mode="v3turbo", precision="fp32")

def trim_silence(audio, threshold=0.005, pad_samples=2400):
    abs_audio = np.abs(audio)
    indices = np.where(abs_audio > threshold)[0]
    if len(indices) == 0:
        return audio
    start = max(0, indices[0] - pad_samples)
    end = min(len(audio), indices[-1] + pad_samples)
    return audio[start:end]

print("3. Generating Vietnamese Intro: 'Thử sức nhé!'...")
vi_intro = tts.infer("Thử sức nhé!", voice="Adam bựa", temperature=0.8, top_k=25, top_p=0.95)
vi_intro = trim_silence(np.asarray(vi_intro, dtype=np.float32).flatten())

print("4. Generating Vietnamese Countdown (5, 4, 3, 2, 1) & Reveal...")
# Use punctuation / commas to give a nice natural suspenseful cadence
vi_text_countdown = "Say hay Tell? Năm... Bốn... Ba... Hai... Một...! Đáp án là Tell! Vì có you ngay phía sau!"
vi_countdown = tts.infer(vi_text_countdown, voice="Adam bựa", temperature=0.7, top_k=25, top_p=0.95)
vi_countdown = trim_silence(np.asarray(vi_countdown, dtype=np.float32).flatten())

pause_short = np.zeros(int(0.12 * 48000), dtype=np.float32)
pause_medium = np.zeros(int(0.18 * 48000), dtype=np.float32)

# Stitch: vi_intro + pause + en_chunk + pause + vi_countdown
stitched = np.concatenate([
    vi_intro,
    pause_short,
    en_chunk,
    pause_medium,
    vi_countdown
])

# Normalize
max_val = np.max(np.abs(stitched))
if max_val > 0:
    stitched = (stitched / max_val) * 0.95

out_path = OUT_DIR / "scene-quiz.wav"
sf.write(str(out_path), stitched, 48000)

total_duration = len(stitched) / 48000.0
fps = 30
duration_frames = int(math.ceil(total_duration * fps)) + 12

print(f"\n✓ Saved updated quiz scene audio: {out_path}")
print(f"Total Duration: {total_duration:.3f}s ({duration_frames} frames at 30fps)")

# Find timing markers
intro_len = len(vi_intro) / 48000.0 + len(pause_short) / 48000.0
en_len = len(en_chunk) / 48000.0 + len(pause_medium) / 48000.0
countdown_start_sec = intro_len + en_len
print(f"Countdown starts at approximately: {countdown_start_sec:.2f}s ({int(countdown_start_sec * fps)} frames)")

