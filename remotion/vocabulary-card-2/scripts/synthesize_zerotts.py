#!/usr/bin/env python3
"""Synthesize vocabulary contrast narration scenes using ZeroTTS (e.g. baotrang voice).

Produces high-fidelity 48kHz audio per scene with exact duration measurement.
"""

from __future__ import annotations

import argparse
import json
import math
import subprocess
import sys
from pathlib import Path

import numpy as np

# Path resolutions
SCRIPT_DIR = Path(__file__).resolve().parent
PROJECT_DIR = SCRIPT_DIR.parent
ROOT_DIR = PROJECT_DIR.parent.parent
TTS_ROOT = ROOT_DIR / "text-to-voice"
TTS_SRC = TTS_ROOT / "src"

sys.path.insert(0, str(TTS_SRC))

from zerotts import ZeroTTS  # noqa: E402

SILENCE_THRESHOLD = 0.008
SILENCE_PAD_SEC = 0.04


def trim_outer_silence(audio: np.ndarray, sample_rate: int) -> np.ndarray:
    """Drop leading and trailing near-silence. Keep short pad for clean consonants."""
    samples = np.abs(audio.reshape(-1))
    loud = np.flatnonzero(samples > SILENCE_THRESHOLD)
    if loud.size == 0:
        return audio
    pad = int(round(SILENCE_PAD_SEC * sample_rate))
    start = max(0, int(loud[0]) - pad)
    end = min(samples.shape[0], int(loud[-1]) + pad + 1)
    return audio[:, start:end]


def main() -> int:
    parser = argparse.ArgumentParser(description="ZeroTTS synthesizer for Vocabulary Contrast")
    parser.add_argument("--json-input", required=True, help="Path to comparison JSON input")
    parser.add_argument("--output-dir", required=True, help="Base output directory for public/audio")
    parser.add_argument("--voice", default="baotrang", help="ZeroTTS voice name (e.g. baotrang)")
    parser.add_argument("--json-output", required=True, help="Path to write updated comparison JSON")

    args = parser.parse_args()

    input_path = Path(args.json_input)
    if not input_path.exists():
        sys.stderr.write(f"Input file not found: {input_path}\n")
        return 1

    with open(input_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    pair_id = data.get("id", "comparison")
    voice = args.voice
    fps = data.get("config", {}).get("fps", 30)

    target_audio_dir = Path(args.output_dir) / "audio" / pair_id
    target_audio_dir.mkdir(parents=True, exist_ok=True)

    print(f"Loading ZeroTTS model with voice '{voice}'...", flush=True)
    tts = ZeroTTS.from_pretrained("zeroweight-ai/ZeroTTS", intra_op_num_threads=8)
    sample_rate = tts.sample_rate

    scenes = data.get("narration", {}).get("scenes", [])
    updated_scenes = []
    current_start_frame = 0
    total_audio_duration = 0.0
    transition_padding_sec = 0.5
    padding_frames = int(round(transition_padding_sec * fps))

    for idx, scene in enumerate(scenes):
        scene_id = scene.get("sceneId", f"scene_{idx}")
        text = scene.get("text", "")
        print(f"Synthesizing [{scene_id}]: {text[:60]}...", flush=True)

        # Synthesize audio with ZeroTTS
        audio = tts.synthesize(
            text,
            voice=voice,
            audio_temperature=0.8,
            audio_topk=25,
            audio_topp=0.95,
            audio_repetition_penalty=1.2,
        )
        audio = np.asarray(audio, dtype=np.float32)
        if audio.ndim == 1:
            audio = audio.reshape(1, -1)

        audio = trim_outer_silence(audio, sample_rate)

        # Save temporary wav
        temp_wav = target_audio_dir / f"scene-{scene_id}.wav"
        final_mp3 = target_audio_dir / f"scene-{scene_id}.mp3"
        tts.save_audio(audio, str(temp_wav))

        # Convert to high-quality MP3 using ffmpeg
        subprocess.run(
            [
                "ffmpeg",
                "-y",
                "-i",
                str(temp_wav),
                "-ar",
                "48000",
                "-b:a",
                "192k",
                str(final_mp3),
            ],
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
            check=True,
        )

        if temp_wav.exists():
            temp_wav.unlink()

        # Calculate exact duration
        duration_sec = float(audio.shape[-1]) / float(sample_rate)
        total_audio_duration += duration_sec

        audio_frames = int(math.ceil(duration_sec * fps))
        duration_in_frames = max(fps * 2, audio_frames + padding_frames)

        relative_path = f"audio/{pair_id}/scene-{scene_id}.mp3"

        scene_copy = dict(scene)
        scene_copy["audioFile"] = relative_path
        scene_copy["audioDurationSeconds"] = round(duration_sec, 4)
        scene_copy["startFrame"] = current_start_frame
        scene_copy["durationInFrames"] = duration_in_frames

        current_start_frame += duration_in_frames
        updated_scenes.append(scene_copy)

    total_video_frames = current_start_frame

    data["narration"]["totalAudioDurationSeconds"] = round(total_audio_duration, 4)
    data["narration"]["scenes"] = updated_scenes
    data["config"]["totalDurationInFrames"] = total_video_frames
    data["config"]["voice"] = f"zeroTTS ({voice})"

    with open(args.json_output, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

    print(
        f"✓ Successfully synthesized {len(updated_scenes)} scenes ({total_audio_duration:.2f}s total, {total_video_frames} frames)."
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())

