"""Synthesize the underarm-odor short and write measured timings.

Each sentence is synthesized on its own, trimmed of outer silence, then joined
with a short pause. Scene cuts fall in the pause before the next scene.

Run from anywhere:

    PYTHONPATH=../../text-to-voice/src \\
      ../../text-to-voice/.venv/bin/python scripts/synthesize.py
"""

from __future__ import annotations

import argparse
import json
import math
import sys
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parents[1]
TTS_ROOT = ROOT.parents[1] / "text-to-voice"
TTS_SRC = TTS_ROOT / "src"
LOCAL_MODEL = TTS_ROOT / "models" / "ZeroTTS"
sys.path.insert(0, str(TTS_SRC))

from zerotts import ZeroTTS  # noqa: E402
from zerotts.text_norm import normalize_vi_text  # noqa: E402

FPS = 30
LEAD_SEC = 0.20
PHRASE_GAP_SEC = 0.12
SCENE_GAP_SEC = 0.28
TAIL_SEC = 0.65
VOICE = "maichi"
SEED = 21
SILENCE_THRESHOLD = 0.008
SILENCE_PAD_SEC = 0.04


def line(identifier: str, scene: str, label: str, text: str) -> dict:
    return {
        "id": identifier,
        "scene": scene,
        "label": label,
        "speech": text,
        "caption": text,
    }


SEGMENTS = [
    line(
        "01",
        "hook",
        "Sự thật",
        "Có một sự thật sẽ làm bạn bật ngửa!",
    ),
    line(
        "02",
        "hook",
        "Sự thật",
        "Bản thân mồ hôi vốn không có mùi!",
    ),
    line(
        "03",
        "bridge",
        "Cầu nối",
        "Mùi khó chịu là do vi khuẩn phân hủy mồ hôi.",
    ),
    line(
        "04",
        "bridge",
        "Cầu nối",
        "Không cần tốn tiền đắt đỏ, dùng ngay 2 nguyên liệu tự nhiên có sẵn trong nhà bạn.",
    ),
    line(
        "05",
        "alum",
        "Phèn chua",
        "Đầu tiên: Phèn chua sẵn trong gian bếp.",
    ),
    line(
        "06",
        "alum",
        "Phèn chua",
        "Rang chín, rồi giã mịn.",
    ),
    line(
        "07",
        "alum",
        "Phèn chua",
        "Sau khi tắm sạch, lau khô, thoa một lớp bột mỏng trực tiếp lên nách để diệt khuẩn.",
    ),
    line(
        "08",
        "citrus",
        "Chanh và gừng",
        "Thứ hai: Chanh hoặc Gừng tươi có ngay trong tủ lạnh.",
    ),
    line(
        "09",
        "citrus",
        "Chanh và gừng",
        "Cắt nửa quả chanh chà nhẹ lên nách, axit tự nhiên sẽ diệt sạch vi khuẩn gây mùi.",
    ),
    line(
        "10",
        "cta",
        "Kết",
        "Vừa an toàn, lành tính lại cực kỳ tiết kiệm!",
    ),
    line(
        "11",
        "cta",
        "Kết",
        "Lưu ngay video này lại để áp dụng hằng ngày nhé!",
    ),
]


def to_frame(seconds: float) -> int:
    return int(round(seconds * FPS))


def trim_outer_silence(audio: np.ndarray, sample_rate: int) -> np.ndarray:
    """Drop leading and trailing near-silence. Keep a short pad so consonants stay."""
    samples = np.abs(audio.reshape(-1))
    loud = np.flatnonzero(samples > SILENCE_THRESHOLD)
    if loud.size == 0:
        return audio
    pad = int(round(SILENCE_PAD_SEC * sample_rate))
    start = max(0, int(loud[0]) - pad)
    end = min(samples.shape[0], int(loud[-1]) + pad + 1)
    return audio[:, start:end]


def build_scenes(cues: list[dict], duration_in_frames: int) -> list[dict]:
    scenes: list[dict] = []
    for cue in cues:
        if not scenes or scenes[-1]["id"] != cue["scene"]:
            scenes.append(
                {
                    "id": cue["scene"],
                    "label": cue["label"],
                    "startFrame": 0,
                    "durationInFrames": 0,
                }
            )
    boundaries = [0]
    for index, scene in enumerate(scenes[:-1]):
        last_cue = [cue for cue in cues if cue["scene"] == scene["id"]][-1]
        next_scene = scenes[index + 1]
        next_cue = [cue for cue in cues if cue["scene"] == next_scene["id"]][0]
        midpoint = (last_cue["end"] + next_cue["start"]) / 2
        boundaries.append(to_frame(midpoint))
    boundaries.append(duration_in_frames)
    for index, scene in enumerate(scenes):
        scene["startFrame"] = boundaries[index]
        scene["durationInFrames"] = boundaries[index + 1] - boundaries[index]
        if scene["durationInFrames"] <= 0:
            raise SystemExit(f"Scene {scene['id']} has no frames")
    return scenes


def display_end(cues: list[dict], scenes: list[dict]) -> None:
    scene_end = {
        scene["id"]: scene["startFrame"] + scene["durationInFrames"] for scene in scenes
    }
    for index, cue in enumerate(cues):
        if index + 1 < len(cues) and cues[index + 1]["scene"] == cue["scene"]:
            cue["displayEndFrame"] = cues[index + 1]["startFrame"]
        else:
            hold = cue["endFrame"] + to_frame(0.18)
            cue["displayEndFrame"] = min(hold, scene_end[cue["scene"]])
        if cue["displayEndFrame"] <= cue["startFrame"]:
            cue["displayEndFrame"] = cue["startFrame"] + 1


def write_timeline(
    path: Path,
    cues: list[dict],
    scenes: list[dict],
    sample_rate: int,
    audio_duration: float,
    duration_in_frames: int,
) -> None:
    scene_ids = " | ".join(json.dumps(scene["id"]) for scene in scenes)
    cue_blocks = []
    for cue in cues:
        cue_blocks.append(
            "\n".join(
                [
                    "  {",
                    f"    id: {json.dumps(cue['id'])},",
                    f"    scene: {json.dumps(cue['scene'])},",
                    f"    caption: {json.dumps(cue['caption'], ensure_ascii=False)},",
                    f"    speech: {json.dumps(cue['speech'], ensure_ascii=False)},",
                    f"    normalized: {json.dumps(cue['normalized'], ensure_ascii=False)},",
                    f"    start: {cue['start']:.4f},",
                    f"    end: {cue['end']:.4f},",
                    f"    startFrame: {cue['startFrame']},",
                    f"    endFrame: {cue['endFrame']},",
                    f"    displayEndFrame: {cue['displayEndFrame']},",
                    "  }",
                ]
            )
        )
    scene_blocks = []
    for scene in scenes:
        scene_blocks.append(
            "\n".join(
                [
                    "  {",
                    f"    id: {json.dumps(scene['id'])},",
                    f"    label: {json.dumps(scene['label'], ensure_ascii=False)},",
                    f"    startFrame: {scene['startFrame']},",
                    f"    durationInFrames: {scene['durationInFrames']},",
                    "  }",
                ]
            )
        )
    path.write_text(
        "\n".join(
            [
                "/** Measured from public/narration.wav. Do not edit by hand. */",
                "",
                "export const fps = 30;",
                'export const audioFile = "narration.wav";',
                f'export const voice = "{VOICE}";',
                f"export const sampleRate = {sample_rate};",
                f"export const audioDurationSeconds = {audio_duration:.4f};",
                f"export const durationInFrames = {duration_in_frames};",
                "",
                f"export type SceneId = {scene_ids};",
                "",
                "export type Cue = {",
                "  id: string;",
                "  scene: SceneId;",
                "  caption: string;",
                "  speech: string;",
                "  normalized: string;",
                "  start: number;",
                "  end: number;",
                "  startFrame: number;",
                "  endFrame: number;",
                "  displayEndFrame: number;",
                "};",
                "",
                "export type SceneWindow = {",
                "  id: SceneId;",
                "  label: string;",
                "  startFrame: number;",
                "  durationInFrames: number;",
                "};",
                "",
                "export const cues: Cue[] = [",
                ",\n".join(cue_blocks),
                "];",
                "",
                "export const scenes: SceneWindow[] = [",
                ",\n".join(scene_blocks),
                "];",
                "",
            ]
        ),
        encoding="utf-8",
    )


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    print("Normalized speech:", flush=True)
    for segment in SEGMENTS:
        if segment["speech"] != segment["caption"]:
            raise SystemExit(f"{segment['id']} speech and caption differ")
        normalized = normalize_vi_text(segment["speech"])
        segment["normalized"] = normalized
        print(f"  [{segment['id']}] {normalized}", flush=True)

    if args.dry_run:
        return 0

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
        cues.append(
            {
                **segment,
                "start": start,
                "end": end,
                "startFrame": to_frame(start),
                "endFrame": max(to_frame(end), to_frame(start) + 1),
            }
        )
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
    if int(full.shape[-1]) != cursor:
        raise SystemExit("Sample cursor drifted from the joined audio")

    audio_duration = cursor / sample_rate
    duration_in_frames = int(math.ceil(audio_duration * FPS - 1e-6))
    scene_windows = build_scenes(cues, duration_in_frames)
    display_end(cues, scene_windows)

    public = ROOT / "public"
    public.mkdir(parents=True, exist_ok=True)
    wav_path = public / "narration.wav"
    tts.save_audio(full, str(wav_path))
    timeline_path = ROOT / "src" / "timeline.ts"
    write_timeline(
        timeline_path,
        cues,
        scene_windows,
        sample_rate,
        audio_duration,
        duration_in_frames,
    )

    print(f"wrote {wav_path}  {audio_duration:.2f}s  {duration_in_frames} frames")
    for scene in scene_windows:
        print(
            f"  {scene['label']:16} {scene['startFrame']:5} + {scene['durationInFrames']:4}"
        )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
