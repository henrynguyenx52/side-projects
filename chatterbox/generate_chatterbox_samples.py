#!/usr/bin/env python3
"""
Generate ~15s sample audios (with and without emotion) for Chatterbox.
Can test:
  1. Default built-in voice (conds.pt)
  2. Any reference voice clips (e.g. Kokoro samples in ../kokoro/kokoro_voice_samples/)
"""
import os
import sys
import time
import argparse
from pathlib import Path
import torch
import torchaudio as ta
from chatterbox.tts import ChatterboxTTS

# 1. Device setup for Mac M-series (MPS) with fallback to CPU
device = "mps" if torch.backends.mps.is_available() else "cpu"
map_location = torch.device(device)

torch_load_original = torch.load
def patched_torch_load(*args, **kwargs):
    if 'map_location' not in kwargs:
        kwargs['map_location'] = map_location
    return torch_load_original(*args, **kwargs)

torch.load = patched_torch_load

# 2. Output directory
output_dir = Path(__file__).resolve().parent / "chatterbox_samples"
output_dir.mkdir(parents=True, exist_ok=True)

# 3. Reference clips directory (uses Kokoro voice samples if present)
kokoro_samples_dir = Path(__file__).resolve().parent.parent / "kokoro" / "kokoro_voice_samples"

# 4. Standard ~15-second texts (~38-42 words at typical 150 wpm)
TEXT_NEUTRAL = (
    "The morning briefing has concluded, and all department reports have been filed into the archive. "
    "Please make sure your quarterly targets are submitted by the end of business today. "
    "We will reconvene tomorrow at nine."
)

TEXT_EMOTIONAL = (
    "I honestly cannot believe we actually pulled this off! After weeks of absolute chaos, "
    "everything worked out better than anyone could have dreamed! "
    "Are you kidding me? This is hands down the greatest victory we have ever had!"
)

def main():
    parser = argparse.ArgumentParser(description="Generate Chatterbox sample audios")
    parser.add_argument("--limit", type=int, default=None, help="Limit number of voices to process")
    parser.add_argument("--voice", type=str, default=None, help="Specific voice name to run (e.g. default_builtin, af_heart)")
    args = parser.parse_args()

    print(f"Loading ChatterboxTTS on {device}...")
    model = ChatterboxTTS.from_pretrained(device=device)

    # Collect voices to sample:
    voices = [{"id": "default_builtin", "path": None, "label": "Chatterbox Default Built-in"}]

    if kokoro_samples_dir.exists():
        ref_files = sorted(list(kokoro_samples_dir.glob("*.wav")))
        for f in ref_files:
            voices.append({"id": f.stem, "path": str(f), "label": f.stem})

    if args.voice:
        voices = [v for v in voices if args.voice.lower() in v["id"].lower()]
        if not voices:
            print(f"No voices matching '{args.voice}' found.")
            return

    if args.limit:
        voices = voices[:args.limit]

    print(f"\nProcessing {len(voices)} voice(s)...")
    print("Generating both Neutral (exaggeration=0.4) and Emotional (exaggeration=1.3) ~15s clips...\n")

    for idx, v in enumerate(voices, 1):
        voice_id = v["id"]
        ref_path = v["path"]
        print(f"[{idx}/{len(voices)}] Generating voice: {voice_id} ({v['label']})")

        # 1. Neutral version
        neutral_out = output_dir / f"{voice_id}_neutral.wav"
        t0 = time.time()
        try:
            wav_neutral = model.generate(
                TEXT_NEUTRAL,
                audio_prompt_path=ref_path,
                exaggeration=0.4,
                cfg_weight=0.5,
                temperature=0.7,
            )
            ta.save(str(neutral_out), wav_neutral, model.sr)
            dur = wav_neutral.shape[-1] / model.sr
            print(f"  -> {neutral_out.name} ({dur:.1f}s) in {time.time() - t0:.2f}s")
        except Exception as e:
            print(f"  -> Error generating neutral for {voice_id}: {e}")

        # 2. Emotional version
        emotional_out = output_dir / f"{voice_id}_emotional.wav"
        t0 = time.time()
        try:
            wav_emotional = model.generate(
                TEXT_EMOTIONAL,
                audio_prompt_path=ref_path,
                exaggeration=1.3,
                cfg_weight=0.3,
                temperature=0.85,
            )
            ta.save(str(emotional_out), wav_emotional, model.sr)
            dur = wav_emotional.shape[-1] / model.sr
            print(f"  -> {emotional_out.name} ({dur:.1f}s) in {time.time() - t0:.2f}s")
        except Exception as e:
            print(f"  -> Error generating emotional for {voice_id}: {e}")

    print(f"\nDone! Samples saved to: {output_dir}")

if __name__ == "__main__":
    main()

