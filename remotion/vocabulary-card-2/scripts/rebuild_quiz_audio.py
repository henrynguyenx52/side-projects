#!/usr/bin/env python3
"""
Rebuild the quiz audio matching the exact on-screen sentence:
"Did she _____ you what happened yesterday?"
with double soft-click for the blank, and VieNeu-TTS "Adam bựa" for Vietnamese countdown & reveal.
"""

import math
import subprocess
from pathlib import Path
import numpy as np
import soundfile as sf
from scipy.signal import resample_poly

PROJECT_DIR = Path(__file__).resolve().parent.parent
SIDE_PROJECTS_DIR = PROJECT_DIR.parent.parent
AUDIO_DIR = PROJECT_DIR / "public" / "audio" / "say-tell"
TEMP_DIR = Path("/tmp/rebuild_quiz_tmp")
TEMP_DIR.mkdir(parents=True, exist_ok=True)

# 1. Load "Did she"
did_she_path = Path("/tmp/blank_samples_tmp/did_she.wav")
did_she, sr1 = sf.read(str(did_she_path))
if sr1 != 48000:
    did_she = resample_poly(did_she, 48000, sr1).astype(np.float32)

# 2. Load "you what happened yesterday?"
en_rest_path = Path("/tmp/you_what_happened_yesterday.wav")
en_rest, sr2 = sf.read(str(en_rest_path))
if sr2 != 48000:
    en_rest = resample_poly(en_rest, 48000, sr2).astype(np.float32)

def trim_silence(audio, threshold=0.005, pad_samples=2400):
    abs_audio = np.abs(audio)
    indices = np.where(abs_audio > threshold)[0]
    if len(indices) == 0:
        return audio
    start = max(0, indices[0] - pad_samples)
    end = min(len(audio), indices[-1] + pad_samples)
    return audio[start:end]

did_she = trim_silence(did_she, threshold=0.01, pad_samples=1200)
en_rest = trim_silence(en_rest, threshold=0.01, pad_samples=1200)

# 3. Load quick double click sfx (85ms spacing)
click_soft_path = SIDE_PROJECTS_DIR / "hyperframes/skills/media-use/audio/assets/sfx/click-soft.mp3"
out_click_wav = TEMP_DIR / "click_soft.wav"
subprocess.run([
    "ffmpeg", "-y", "-i", str(click_soft_path),
    "-ac", "1", "-ar", "48000",
    "-t", "0.15",
    str(out_click_wav)
], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=True)
c_soft, _ = sf.read(str(out_click_wav))
c_soft = c_soft.astype(np.float32) * 0.95

spacing_samples = int((85 / 1000.0) * 48000)
double_click_sfx = np.zeros(spacing_samples + len(c_soft), dtype=np.float32)
double_click_sfx[:len(c_soft)] += c_soft
double_click_sfx[spacing_samples:spacing_samples + len(c_soft)] += c_soft

pause_click = np.zeros(int(0.08 * 48000), dtype=np.float32)

# English phrase: "Did she" + [click-click] + "you what happened yesterday?"
en_phrase = np.concatenate([
    did_she,
    pause_click,
    double_click_sfx,
    pause_click,
    en_rest
])

# 4. Generate Vietnamese parts with VieNeu-TTS voice "Adam bựa"
print("Loading VieNeu-TTS model with voice 'Adam bựa'...")
from vieneu import Vieneu
tts = Vieneu(mode="v3turbo", precision="fp32")

# Part A: Intro
vi_intro = tts.infer("Thử sức nhé!", voice="Adam bựa", temperature=0.8, top_k=25, top_p=0.95)
vi_intro = trim_silence(np.asarray(vi_intro, dtype=np.float32).flatten())

# Part B: Countdown & reveal
vi_countdown_text = "Say hay Tell? Năm... Bốn... Ba... Hai... Một...! Đáp án là Tell! Vì có you ngay phía sau!"
vi_countdown = tts.infer(vi_countdown_text, voice="Adam bựa", temperature=0.7, top_k=25, top_p=0.95)
vi_countdown = trim_silence(np.asarray(vi_countdown, dtype=np.float32).flatten())

pause_short = np.zeros(int(0.12 * 48000), dtype=np.float32)
pause_medium = np.zeros(int(0.18 * 48000), dtype=np.float32)

# Stitch: vi_intro + pause + en_phrase + pause + vi_countdown
stitched = np.concatenate([
    vi_intro,
    pause_short,
    en_phrase,
    pause_medium,
    vi_countdown
])

max_val = np.max(np.abs(stitched))
if max_val > 0:
    stitched = (stitched / max_val) * 0.95

out_file = AUDIO_DIR / "scene-quiz.wav"
sf.write(str(out_file), stitched, 48000)

total_sec = len(stitched) / 48000.0
fps = 30
total_frames = int(math.ceil(total_sec * fps)) + 12

print(f"\n✓ Saved updated quiz scene audio: {out_file}")
print(f"Total Duration: {total_sec:.2f}s ({total_frames} frames)")

# Measure timings
t_intro = len(vi_intro) / 48000.0 + len(pause_short) / 48000.0
t_en = len(en_phrase) / 48000.0 + len(pause_medium) / 48000.0
t_countdown_start = t_intro + t_en
print(f"Intro ends / EN starts at: {t_intro:.2f}s ({int(t_intro*fps)} frames)")
print(f"EN ends / Countdown prompt starts at: {t_countdown_start:.2f}s ({int(t_countdown_start*fps)} frames)")

