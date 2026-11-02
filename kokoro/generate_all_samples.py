#!/usr/bin/env python3
import os
import sys
import time
from pathlib import Path
import soundfile as sf
from huggingface_hub import HfApi
import torch

output_dir = Path("/Users/nguyenhuuhung/Documents/side-projects/kokoro_voice_samples")
output_dir.mkdir(parents=True, exist_ok=True)

print("Fetching available voices from hexgrad/Kokoro-82M...")
api = HfApi()
files = api.list_repo_files("hexgrad/Kokoro-82M")
all_voices = sorted([f.replace("voices/", "").replace(".pt", "") for f in files if f.startswith("voices/") and f.endswith(".pt")])
print(f"Found {len(all_voices)} voices total.")

from kokoro import KPipeline

# Initialize pipelines for US and UK English
print("Initializing American English pipeline ('a')...")
pipeline_a = KPipeline(lang_code="a")

print("Initializing British English pipeline ('b')...")
# Reuse the model from pipeline_a
pipeline_b = KPipeline(lang_code="b", model=pipeline_a.model)

sample_text_us = "Hello! This is a test sample of Kokoro TTS. I hope you find my voice clear, natural, and pleasant to listen to."
sample_text_uk = "Hello! This is a test sample of Kokoro TTS. I hope you find my voice clear, natural, and pleasant to listen to."

english_voices = [v for v in all_voices if v.startswith(("af_", "am_", "bf_", "bm_"))]
other_voices = [v for v in all_voices if not v.startswith(("af_", "am_", "bf_", "bm_"))]

print(f"Processing {len(english_voices)} English voices...")

results = []

for idx, voice in enumerate(english_voices, 1):
    lang_code = voice[0] # 'a' or 'b'
    pipe = pipeline_a if lang_code == "a" else pipeline_b
    text = sample_text_us if lang_code == "a" else sample_text_uk
    out_file = output_dir / f"{voice}.wav"
    
    t0 = time.time()
    try:
        generator = pipe(text, voice=voice, speed=1)
        audio_chunks = []
        for gs, ps, audio in generator:
            audio_chunks.append(audio)
        if audio_chunks:
            full_audio = torch.cat(audio_chunks, dim=0) if isinstance(audio_chunks[0], torch.Tensor) else audio_chunks[0]
            sf.write(str(out_file), full_audio, 24000)
            elapsed = time.time() - t0
            print(f"[{idx}/{len(english_voices)}] Generated {voice}.wav in {elapsed:.2f}s")
            results.append({"voice": voice, "file": f"{voice}.wav", "status": "ok"})
    except Exception as e:
        print(f"[{idx}/{len(english_voices)}] Error generating {voice}: {e}")
        results.append({"voice": voice, "file": f"{voice}.wav", "status": f"error: {e}"})

# Generate other language voices using pipeline_a so user can hear their accents if desired
other_dir = output_dir / "other_languages"
other_dir.mkdir(exist_ok=True)
print(f"Processing {len(other_voices)} other language voices in other_languages/...")
for idx, voice in enumerate(other_voices, 1):
    out_file = other_dir / f"{voice}.wav"
    t0 = time.time()
    try:
        generator = pipeline_a(sample_text_us, voice=voice, speed=1)
        audio_chunks = []
        for gs, ps, audio in generator:
            audio_chunks.append(audio)
        if audio_chunks:
            full_audio = torch.cat(audio_chunks, dim=0) if isinstance(audio_chunks[0], torch.Tensor) else audio_chunks[0]
            sf.write(str(out_file), full_audio, 24000)
            elapsed = time.time() - t0
            print(f"[Other {idx}/{len(other_voices)}] Generated {voice}.wav in {elapsed:.2f}s")
    except Exception as e:
        print(f"[Other {idx}/{len(other_voices)}] Error generating {voice}: {e}")

print("All voices generated successfully!")

