"""Synthesize the orbital underarm short and write measured cue times.

Run from videos/tham-orbital:

    PYTHONPATH=../../text-to-voice/src \\
      ../../text-to-voice/.venv/bin/python scripts/synthesize.py
"""

from __future__ import annotations

import json
import math
import sys
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parents[1]
TTS_ROOT = ROOT.parents[1] / "text-to-voice"
sys.path.insert(0, str(TTS_ROOT / "src"))

from zerotts import ZeroTTS  # noqa: E402
from zerotts.text_norm import normalize_vi_text  # noqa: E402

FPS = 30
LEAD_SEC = 0.25
PHRASE_GAP_SEC = 0.14
SCENE_GAP_SEC = 0.32
TAIL_SEC = 0.70
VOICE = "quangminh"
SEED = 7
SILENCE_THRESHOLD = 0.008
SILENCE_PAD_SEC = 0.04
LOCAL_MODEL = TTS_ROOT / "models" / "ZeroTTS"


def line(identifier: str, scene: str, text: str, hot: str) -> dict:
    return {"id": identifier, "scene": scene, "speech": text, "caption": text, "hot": hot}


SEGMENTS = [
    line("01", "orbit", "Thâm nách là vòng, không phải vết bẩn.", "vòng"),
    line("02", "loop", "70 đến 80% bắt đầu từ cọ và cạo.", "80%"),
    line("03", "loop", "Cọ xong thì da viêm.", "viêm"),
    line("04", "loop", "Viêm xong thì da đậm.", "đậm"),
    line("05", "loop", "Khuỷu chống bàn cũng là nhát cọ.", "cọ"),
    line("06", "contrast", "Chanh và soda không mở được vòng.", "vòng"),
    line("07", "contrast", "Chúng chỉ thêm một nhát cọ nữa.", "cọ"),
    line("08", "undo", "Bớt cọ: áo thoáng, cạo thưa hơn.", "thoáng"),
    line("09", "undo", "Dịu viêm: rửa nhẹ, rồi thấm khô.", "Dịu"),
    line("10", "undo", "Giữ da: dưỡng và chống nắng.", "dưỡng"),
    line("11", "close", "Vòng dừng khi da được để yên.", "dừng"),
    line("12", "close", "Dày, mịn như nhung thì đi khám.", "khám"),
]


def to_frame(seconds: float) -> int:
    return int(round(seconds * FPS))


def trim_outer_silence(audio: np.ndarray, sample_rate: int) -> np.ndarray:
    samples = np.abs(audio.reshape(-1))
    loud = np.flatnonzero(samples > SILENCE_THRESHOLD)
    if loud.size == 0:
        return audio
    pad = int(round(SILENCE_PAD_SEC * sample_rate))
    start = max(0, int(loud[0]) - pad)
    end = min(samples.shape[0], int(loud[-1]) + pad + 1)
    return audio[:, start:end]


def main() -> int:
    for segment in SEGMENTS:
        if segment["speech"] != segment["caption"]:
            raise SystemExit(f"{segment['id']} speech and caption differ")
        segment["normalized"] = normalize_vi_text(segment["speech"])
        print(f"  [{segment['id']}] {segment['normalized']}", flush=True)

    np.random.seed(SEED)
    model = str(LOCAL_MODEL if LOCAL_MODEL.exists() else "zeroweight-ai/ZeroTTS")
    print(f"model {model}", flush=True)
    tts = ZeroTTS.from_pretrained(model, intra_op_num_threads=8)
    sample_rate = tts.sample_rate
    pieces: list[np.ndarray] = []
    cursor = 0
    cues: list[dict] = []

    def push_silence(seconds: float) -> None:
        nonlocal cursor
        count = int(round(seconds * sample_rate))
        pieces.append(np.zeros((1, count), dtype=np.float32))
        cursor += count

    push_silence(LEAD_SEC)
    for index, segment in enumerate(SEGMENTS):
        print(f"synthesize {segment['id']}/{len(SEGMENTS)}", flush=True)
        audio = tts.synthesize(
            segment["normalized"],
            voice=VOICE,
            audio_temperature=0.8,
            audio_topk=25,
            audio_topp=0.95,
            audio_repetition_penalty=1.2,
        )
        audio = np.asarray(audio, dtype=np.float32)
        if audio.ndim == 1:
            audio = audio.reshape(1, -1)
        audio = trim_outer_silence(audio, sample_rate)
        start = cursor / sample_rate
        cursor += int(audio.shape[-1])
        end = cursor / sample_rate
        cues.append({**segment, "start": round(start, 3), "end": round(end, 3)})
        pieces.append(audio)
        if index < len(SEGMENTS) - 1:
            gap = (
                SCENE_GAP_SEC
                if SEGMENTS[index + 1]["scene"] != segment["scene"]
                else PHRASE_GAP_SEC
            )
            push_silence(gap)
    push_silence(TAIL_SEC)

    full = np.concatenate(pieces, axis=-1)
    audio_duration = cursor / sample_rate
    duration = round(audio_duration, 3)

    scenes = []
    for cue in cues:
        if not scenes or scenes[-1]["id"] != cue["scene"]:
            scenes.append({"id": cue["scene"], "start": cue["start"], "end": cue["end"]})
        else:
            scenes[-1]["end"] = cue["end"]
    for index, scene in enumerate(scenes):
        scene["end"] = duration if index == len(scenes) - 1 else scenes[index + 1]["start"]
        scene["start"] = 0 if index == 0 else scene["start"]
        scene["duration"] = round(scene["end"] - scene["start"], 3)

    assets = ROOT / "assets"
    assets.mkdir(parents=True, exist_ok=True)
    wav_path = assets / "narration.wav"
    tts.save_audio(full, str(wav_path))
    payload = {
        "voice": VOICE,
        "fps": FPS,
        "duration": duration,
        "scenes": scenes,
        "cues": [
            {
                "id": cue["id"],
                "scene": cue["scene"],
                "text": cue["caption"],
                "hot": cue["hot"],
                "start": cue["start"],
                "end": cue["end"],
            }
            for cue in cues
        ],
    }
    (assets / "timeline.json").write_text(
        json.dumps(payload, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    print(f"wrote {wav_path}  {duration:.2f}s  {math.ceil(duration * FPS)} frames")
    for scene in scenes:
        print(f"  {scene['id']:10} {scene['start']:.3f} + {scene['duration']:.3f}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
