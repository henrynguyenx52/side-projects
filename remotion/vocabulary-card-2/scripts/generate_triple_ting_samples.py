#!/usr/bin/env python3
"""
Generate sample audio clips for "Did she [TING-TING-TING] you the truth?"
Testing 5-6 variations of 3-sound sequences for the blank space.
"""

import subprocess
from pathlib import Path
import numpy as np
import soundfile as sf

PROJECT_DIR = Path(__file__).resolve().parent.parent
SIDE_PROJECTS_DIR = PROJECT_DIR.parent.parent
SAMPLES_DIR = PROJECT_DIR / "public" / "audio" / "triple-ting-samples"
SAMPLES_DIR.mkdir(parents=True, exist_ok=True)

TEMP_DIR = Path("/tmp/triple_ting_tmp")
TEMP_DIR.mkdir(parents=True, exist_ok=True)

# Load Kokoro speech
speech_dir = Path("/tmp/blank_samples_tmp")
did_she, sr = sf.read(str(speech_dir / "did_she.wav"))
you_truth, _ = sf.read(str(speech_dir / "you_the_truth.wav"))

# Resample to 48kHz if needed
from scipy.signal import resample_poly
if sr != 48000:
    did_she = resample_poly(did_she, 48000, sr).astype(np.float32)
    you_truth = resample_poly(you_truth, 48000, sr).astype(np.float32)

# Trim audio
def trim_audio(audio, threshold=0.01):
    idx = np.where(np.abs(audio) > threshold)[0]
    if len(idx) == 0:
        return audio
    start = max(0, idx[0] - 1200)
    end = min(len(audio), idx[-1] + 1200)
    return audio[start:end]

did_she = trim_audio(did_she)
you_truth = trim_audio(you_truth)

def get_wav_resampled(path_in, pitch_factor=1.0, duration=0.25):
    """Loads an audio file, optionally pitch shifts, and returns 48kHz mono numpy array."""
    out_wav = TEMP_DIR / f"temp_{Path(path_in).stem}_{pitch_factor}.wav"
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

def build_triple(sound_list, spacing_ms=110):
    """Combines 3 sounds with a given spacing between sound starts."""
    spacing_samples = int((spacing_ms / 1000.0) * 48000)
    total_len = spacing_samples * (len(sound_list) - 1) + len(sound_list[-1])
    combined = np.zeros(total_len, dtype=np.float32)
    
    for i, s in enumerate(sound_list):
        offset = i * spacing_samples
        end = min(total_len, offset + len(s))
        combined[offset:end] += s[:end - offset]
    
    # Normalize peak if clipping
    peak = np.max(np.abs(combined))
    if peak > 0.95:
        combined = combined * (0.95 / peak)
    return combined

# Source sound paths
ping_mp3 = SIDE_PROJECTS_DIR / "hyperframes/skills/media-use/audio/assets/sfx/ping.mp3"
pop_mp3 = SIDE_PROJECTS_DIR / "hyperframes/skills/media-use/audio/assets/sfx/pop.mp3"
click_mp3 = SIDE_PROJECTS_DIR / "hyperframes/skills/media-use/audio/assets/sfx/click-soft.mp3"
tink_aiff = Path("/System/Library/Sounds/Tink.aiff")
bottle_aiff = Path("/System/Library/Sounds/Bottle.aiff")

samples_definitions = []

# 1. Triple Crystal Ting (Uniform Rhythm)
s_ping = get_wav_resampled(ping_mp3, pitch_factor=1.1, duration=0.22) * 0.75
triple_1 = build_triple([s_ping, s_ping, s_ping], spacing_ms=120)
samples_definitions.append({
    "file": "1_triple_crystal_ting.wav",
    "name": "Triple Crystal Ting (Ting - Ting - Ting)",
    "desc": "3 clean, crisp crystal bell tings in uniform cadence.",
    "sfx": triple_1
})

# 2. Ascending Musical Ting-Ting-Ting (Rising Pitch: Do - Re - Mi)
s_p1 = get_wav_resampled(ping_mp3, pitch_factor=1.0, duration=0.22) * 0.75
s_p2 = get_wav_resampled(ping_mp3, pitch_factor=1.12, duration=0.22) * 0.75
s_p3 = get_wav_resampled(ping_mp3, pitch_factor=1.26, duration=0.25) * 0.8
triple_2 = build_triple([s_p1, s_p2, s_p3], spacing_ms=115)
samples_definitions.append({
    "file": "2_ascending_ting.wav",
    "name": "Ascending Ting-Ting-TING! (Do - Re - Mi)",
    "desc": "3 ascending bell tings with a cheerful rising pitch — very inquisitive & gamified.",
    "sfx": triple_2
})

# 3. macOS Tink Triple (Subtle High-Register Bell)
s_tink1 = get_wav_resampled(tink_aiff, pitch_factor=1.0, duration=0.20) * 0.85
s_tink2 = get_wav_resampled(tink_aiff, pitch_factor=1.1, duration=0.20) * 0.85
s_tink3 = get_wav_resampled(tink_aiff, pitch_factor=1.2, duration=0.22) * 0.9
triple_3 = build_triple([s_tink1, s_tink2, s_tink3], spacing_ms=110)
samples_definitions.append({
    "file": "3_macos_tink_triple.wav",
    "name": "Triple Tink (macOS High Glass)",
    "desc": "Delicate, high-frequency glass tinks — light, modern, unobtrusive.",
    "sfx": triple_3
})

# 4. Triple Cartoon Pop (Pop - Pop - Pop)
s_pop1 = get_wav_resampled(pop_mp3, pitch_factor=1.0, duration=0.18) * 0.85
s_pop2 = get_wav_resampled(pop_mp3, pitch_factor=1.1, duration=0.18) * 0.85
s_pop3 = get_wav_resampled(pop_mp3, pitch_factor=1.22, duration=0.20) * 0.9
triple_4 = build_triple([s_pop1, s_pop2, s_pop3], spacing_ms=115)
samples_definitions.append({
    "file": "4_triple_cartoon_pop.wav",
    "name": "Triple Bubble Pop (Duolingo Style)",
    "desc": "3 rhythmic bubbly pops with rising inflection (pop - pop - POP!).",
    "sfx": triple_4
})

# 5. Triple Water Bottle Plink (Plink - Plink - Plink)
s_bot1 = get_wav_resampled(bottle_aiff, pitch_factor=1.0, duration=0.20) * 0.85
s_bot2 = get_wav_resampled(bottle_aiff, pitch_factor=1.12, duration=0.20) * 0.85
s_bot3 = get_wav_resampled(bottle_aiff, pitch_factor=1.25, duration=0.22) * 0.9
triple_5 = build_triple([s_bot1, s_bot2, s_bot3], spacing_ms=115)
samples_definitions.append({
    "file": "5_triple_bottle_plink.wav",
    "name": "Triple Water Plink (Wooden / Bottle)",
    "desc": "Warm, round, percussive plinks — acoustic and organic.",
    "sfx": triple_5
})

# 6. Triple Soft Tap (Tap - Tap - Tap)
s_tap = get_wav_resampled(click_mp3, pitch_factor=1.05, duration=0.15) * 0.9
triple_6 = build_triple([s_tap, s_tap, s_tap], spacing_ms=100)
samples_definitions.append({
    "file": "6_triple_soft_tap.wav",
    "name": "Triple Soft Tap (Minimalist Click)",
    "desc": "3 quick tactile taps — clean keyboard / UI haptic feel.",
    "sfx": triple_6
})

# Stitch each with voice: [did_she] + [pause 0.08s] + [triple_sfx] + [pause 0.08s] + [you_truth]
pause_gap = np.zeros(int(0.08 * 48000), dtype=np.float32)

for sdef in samples_definitions:
    combined = np.concatenate([
        did_she,
        pause_gap,
        sdef["sfx"],
        pause_gap,
        you_truth
    ])
    out_path = SAMPLES_DIR / sdef["file"]
    sf.write(str(out_path), combined, 48000)
    print(f"Generated: {sdef['file']}")

print(f"\nAll 6 triple-ting samples generated in: {SAMPLES_DIR}")

