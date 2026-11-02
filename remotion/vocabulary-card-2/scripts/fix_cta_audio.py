#!/usr/bin/env python3
"""
Fix the CTA audio:
1. Kokoro: generate "She" and "me that she loved him."
2. Insert double soft click: "She [double-click] me that she loved him."
3. VieNeu-TTS with voice "Adam bựa":
   - "Giờ anh có một câu dành riêng cho em nhé!"
   - "Say hay Tell? [cười] Comment đáp án bên dưới cho anh biết nhé! Anh sẽ kiểm tra xem có bao nhiêu người trả lời đúng. Đừng nhìn đáp án người khác đấy!"
4. Stitch into scene-cta.wav
"""

import os
import math
import subprocess
from pathlib import Path
import numpy as np
import soundfile as sf
from scipy.signal import resample_poly

PROJECT_DIR = Path(__file__).resolve().parent.parent
SIDE_PROJECTS_DIR = PROJECT_DIR.parent.parent
AUDIO_DIR = PROJECT_DIR / "public" / "audio" / "say-tell"
SAMPLES_DIR = PROJECT_DIR / "public" / "audio" / "soft-click-samples"

TEMP_DIR = Path("/tmp/fix_cta_tmp")
TEMP_DIR.mkdir(parents=True, exist_ok=True)

# Step 1: Generate "She" and "me that she loved him." with Kokoro voice "am_adam"
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

gen_phrase("She", "she.wav")
gen_phrase("me that she loved him.", "me_loved_him.wav")
print("Generated She and me that she loved him with Kokoro.")
"""

tmp_py = Path("/tmp/run_kokoro_cta.py")
tmp_py.write_text(kokoro_script, encoding="utf-8")

print("1. Generating English segments with Kokoro...")
cmd = f'cd "{SIDE_PROJECTS_DIR / "kokoro"}" && uv run python "{tmp_py}"'
ret = os.system(cmd)
if ret != 0:
    raise RuntimeError("Kokoro generation failed")

# Load Kokoro speech
she, sr1 = sf.read(str(TEMP_DIR / "she.wav"))
me_loved, sr2 = sf.read(str(TEMP_DIR / "me_loved_him.wav"))

if sr1 != 48000:
    she = resample_poly(she, 48000, sr1).astype(np.float32)
if sr2 != 48000:
    me_loved = resample_poly(me_loved, 48000, sr2).astype(np.float32)

def trim_silence(audio, threshold=0.005, pad_samples=2400):
    abs_audio = np.abs(audio)
    indices = np.where(abs_audio > threshold)[0]
    if len(indices) == 0:
        return audio
    start = max(0, indices[0] - pad_samples)
    end = min(len(audio), indices[-1] + pad_samples)
    return audio[start:end]

she = trim_silence(she, threshold=0.01, pad_samples=1200)
me_loved = trim_silence(me_loved, threshold=0.01, pad_samples=1200)

# Load the quick double click sfx
click_soft_path = SIDE_PROJECTS_DIR / "hyperframes/skills/media-use/audio/assets/sfx/click-soft.mp3"

out_wav = TEMP_DIR / "click_soft.wav"
subprocess.run([
    "ffmpeg", "-y", "-i", str(click_soft_path),
    "-ac", "1", "-ar", "48000",
    "-t", "0.15",
    str(out_wav)
], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=True)
c_soft, _ = sf.read(str(out_wav))
c_soft = c_soft.astype(np.float32) * 0.95

# Double click spacing 85ms (same as 2_double_soft_click_quick)
spacing_samples = int((85 / 1000.0) * 48000)
double_click_sfx = np.zeros(spacing_samples + len(c_soft), dtype=np.float32)
double_click_sfx[:len(c_soft)] += c_soft
double_click_sfx[spacing_samples:spacing_samples + len(c_soft)] += c_soft

pause_click = np.zeros(int(0.08 * 48000), dtype=np.float32)

# Build English chunk: "She" + pause + [click-click] + pause + "me that she loved him."
en_chunk = np.concatenate([
    she,
    pause_click,
    double_click_sfx,
    pause_click,
    me_loved
])

# Step 2: Generate Vietnamese segments with VieNeu-TTS voice "Adam bựa"
print("2. Generating Vietnamese segments with VieNeu-TTS voice 'Adam bựa'...")
from vieneu import Vieneu
tts = Vieneu(mode="v3turbo", precision="fp32")

# Part A: Intro
vi_intro = tts.infer("Giờ anh có một câu dành riêng cho em nhé!", voice="Adam bựa", temperature=0.8, top_k=25, top_p=0.95)
vi_intro = trim_silence(np.asarray(vi_intro, dtype=np.float32).flatten())

# Part B: Outro
vi_text_outro = "Say hay Tell? [cười] Comment đáp án bên dưới cho anh biết nhé! Anh sẽ kiểm tra xem có bao nhiêu người trả lời đúng. Đừng nhìn đáp án người khác đấy!"
vi_outro = tts.infer(vi_text_outro, voice="Adam bựa", temperature=0.8, top_k=25, top_p=0.95)
vi_outro = trim_silence(np.asarray(vi_outro, dtype=np.float32).flatten())

pause_short = np.zeros(int(0.12 * 48000), dtype=np.float32)
pause_medium = np.zeros(int(0.18 * 48000), dtype=np.float32)

# Stitch: vi_intro + pause + en_chunk + pause + vi_outro
stitched = np.concatenate([
    vi_intro,
    pause_short,
    en_chunk,
    pause_medium,
    vi_outro
])

max_val = np.max(np.abs(stitched))
if max_val > 0:
    stitched = (stitched / max_val) * 0.95

out_file = AUDIO_DIR / "scene-cta.wav"
sf.write(str(out_file), stitched, 48000)

dur_sec = len(stitched) / 48000.0
fps = 30
dur_frames = int(math.ceil(dur_sec * fps)) + 12

print(f"\n✓ Saved updated CTA scene audio to: {out_file}")
print(f"Total Duration: {dur_sec:.2f}s ({dur_frames} frames)")

