"""Synthesize the fuel-price narration with ZeroTTS and write measured timings.

Sentence audio is the source of truth. Each sentence is synthesized on its own,
trimmed of outer silence, then joined with a fixed pause. Scene cuts fall in
the pause before the next sentence, so the visual arrives slightly early
without guessing word durations.

Product codes and industry names are spoken as written (E10, E5, RON 95-III,
PVOIL, Petrolimex, USD). Only prices, dates, and percentages are expanded
into spoken Vietnamese. The caption is the same text.

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
LEAD_SEC = 0.55
PHRASE_GAP_SEC = 0.20
SCENE_GAP_SEC = 0.46
TAIL_SEC = 1.40
VOICE = "baotrang"
SEED = 11
SILENCE_THRESHOLD = 0.008
SILENCE_PAD_SEC = 0.04

SEGMENTS = [
    {
        "id": "01",
        "scene": "open",
        "label": "Mở đầu",
        "speech": "Từ 15 giờ ngày 22/10/2026, giá xăng E10 giảm hơn 1.800 đồng một lít.",
        "caption": "Từ 15 giờ ngày 22/10/2026, giá xăng E10 giảm hơn 1.800 đồng một lít.",
    },
    {
        "id": "02",
        "scene": "gasoline",
        "label": "Xăng giảm",
        "speech": "Xăng E10 RON 95-III giảm 1.810 đồng, xuống 25.210 đồng một lít.",
        "caption": "Xăng E10 RON 95-III giảm 1.810 đồng, xuống 25.210 đồng một lít.",
    },
    {
        "id": "03",
        "scene": "gasoline",
        "label": "Xăng giảm",
        "speech": "Xăng E5 RON 92 giảm 1.610 đồng, còn 25.360 đồng một lít.",
        "caption": "Xăng E5 RON 92 giảm 1.610 đồng, còn 25.360 đồng một lít.",
    },
    {
        "id": "04",
        "scene": "diesel",
        "label": "Dầu tăng",
        "speech": "Ngược lại, dầu diesel tăng 450 đồng, lên 29.550 đồng một lít.",
        "caption": "Ngược lại, dầu diesel tăng 450 đồng, lên 29.550 đồng một lít.",
    },
    {
        "id": "05",
        "scene": "diesel",
        "label": "Dầu tăng",
        "speech": "Dầu mazut tăng lên 23.370 đồng một kilôgam.",
        "caption": "Dầu mazut tăng lên 23.370 đồng một kilôgam.",
    },
    {
        "id": "06",
        "scene": "world",
        "label": "Giá thế giới",
        "speech": "Giá trong nước được điều chỉnh theo mặt bằng thế giới.",
        "caption": "Giá trong nước được điều chỉnh theo mặt bằng thế giới.",
    },
    {
        "id": "07",
        "scene": "world",
        "label": "Giá thế giới",
        "speech": "Bình quân 7 ngày, RON 95 dùng để pha E10 giảm 8,4%, xuống 133,5 USD một thùng.",
        "caption": "Bình quân 7 ngày, RON 95 dùng để pha E10 giảm 8,4%, xuống 133,5 USD một thùng.",
    },
    {
        "id": "08",
        "scene": "world",
        "label": "Giá thế giới",
        "speech": "Dầu diesel tăng 1,8%, ở mức 168 USD.",
        "caption": "Dầu diesel tăng 1,8%, ở mức 168 USD.",
    },
    {
        "id": "09",
        "scene": "world",
        "label": "Giá thế giới",
        "speech": "Dầu mazut lên 800,6 USD một tấn, tăng 3,7%.",
        "caption": "Dầu mazut lên 800,6 USD một tấn, tăng 3,7%.",
    },
    {
        "id": "10",
        "scene": "fund",
        "label": "Quỹ bình ổn",
        "speech": "Kỳ này, nhà điều hành trích Quỹ bình ổn giá 300 đồng một lít với xăng sinh học.",
        "caption": "Kỳ này, nhà điều hành trích Quỹ bình ổn giá 300 đồng một lít với xăng sinh học.",
    },
    {
        "id": "11",
        "scene": "fund",
        "label": "Quỹ bình ổn",
        "speech": "Đồng thời ngừng sử dụng quỹ với các mặt hàng còn lại.",
        "caption": "Đồng thời ngừng sử dụng quỹ với các mặt hàng còn lại.",
    },
    {
        "id": "12",
        "scene": "retail",
        "label": "Giá bán lẻ",
        "speech": "Petrolimex và PVOIL bán thấp hơn giá trần từ 300 đến 350 đồng mỗi lít.",
        "caption": "Petrolimex và PVOIL bán thấp hơn giá trần từ 300 đến 350 đồng mỗi lít.",
    },
    {
        "id": "13",
        "scene": "retail",
        "label": "Giá bán lẻ",
        "speech": "Giá thực tế xăng E10 còn khoảng 24.860 đến 24.910 đồng.",
        "caption": "Giá thực tế xăng E10 còn khoảng 24.860 đến 24.910 đồng.",
    },
    {
        "id": "14",
        "scene": "retail",
        "label": "Giá bán lẻ",
        "speech": "Xăng E5 còn khoảng 25.010 đến 25.060 đồng.",
        "caption": "Xăng E5 còn khoảng 25.010 đến 25.060 đồng.",
    },
    {
        "id": "15",
        "scene": "retail",
        "label": "Giá bán lẻ",
        "speech": "Mức giá này được các doanh nghiệp giữ đến ngày 29/10.",
        "caption": "Mức giá này được các doanh nghiệp giữ đến ngày 29/10.",
    },
    {
        "id": "16",
        "scene": "prior",
        "label": "Kỳ trước",
        "speech": "Ở kỳ ngày 15/10, 14 doanh nghiệp đầu mối cũng bán thấp hơn giá cơ sở.",
        "caption": "Ở kỳ ngày 15/10, 14 doanh nghiệp đầu mối cũng bán thấp hơn giá cơ sở.",
    },
    {
        "id": "17",
        "scene": "prior",
        "label": "Kỳ trước",
        "speech": "Mức chênh từ 300 đến 350 đồng mỗi lít, mỗi kilôgam.",
        "caption": "Mức chênh từ 300 đến 350 đồng mỗi lít, mỗi kilôgam.",
    },
    {
        "id": "18",
        "scene": "prior",
        "label": "Kỳ trước",
        "speech": "PVOIL, Long Hưng và Trường An giảm 350 đồng.",
        "caption": "PVOIL, Long Hưng và Trường An giảm 350 đồng.",
    },
    {
        "id": "19",
        "scene": "prior",
        "label": "Kỳ trước",
        "speech": "Petrolimex và 10 đầu mối khác giảm 300 đồng.",
        "caption": "Petrolimex và 10 đầu mối khác giảm 300 đồng.",
    },
    {
        "id": "20",
        "scene": "policy",
        "label": "Nghị định",
        "speech": "Ngày 21/10, Thủ tướng yêu cầu Bộ Công Thương hoàn thiện và trình Chính phủ dự thảo nghị định mới về kinh doanh xăng dầu.",
        "caption": "Ngày 21/10, Thủ tướng yêu cầu Bộ Công Thương hoàn thiện và trình Chính phủ dự thảo nghị định mới về kinh doanh xăng dầu.",
    },
    {
        "id": "21",
        "scene": "policy",
        "label": "Nghị định",
        "speech": "Hạn chót là trước ngày 10/11.",
        "caption": "Hạn chót là trước ngày 10/11.",
    },
    {
        "id": "22",
        "scene": "policy",
        "label": "Nghị định",
        "speech": "Dự thảo đã được xây dựng hơn hai năm, qua 14 phiên bản.",
        "caption": "Dự thảo đã được xây dựng hơn hai năm, qua 14 phiên bản.",
    },
    {
        "id": "23",
        "scene": "policy",
        "label": "Nghị định",
        "speech": "Theo phương án đề xuất, Nhà nước sẽ không công bố giá cơ sở định kỳ.",
        "caption": "Theo phương án đề xuất, Nhà nước sẽ không công bố giá cơ sở định kỳ.",
    },
    {
        "id": "24",
        "scene": "policy",
        "label": "Nghị định",
        "speech": "Thương nhân đầu mối tự quyết giá bán lẻ theo công thức, và phải kê khai để cơ quan quản lý giám sát.",
        "caption": "Thương nhân đầu mối tự quyết giá bán lẻ theo công thức, và phải kê khai để cơ quan quản lý giám sát.",
    },
    {
        "id": "25",
        "scene": "source",
        "label": "Nguồn",
        "speech": "Nguồn: VnExpress. Bài của Phương Dung, ngày 22/10/2026.",
        "caption": "Nguồn: VnExpress. Bài của Phương Dung, ngày 22/10/2026.",
    },
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


PROTECTED_TERMS = (
    "RON 95-III",
    "RON 95",
    "RON 92",
    "E10",
    "E5",
    "PVOIL",
    "Petrolimex",
    "USD",
    "VnExpress",
)


def normalize_for_speech(text: str) -> str:
    """Expand prices and dates, and leave industry terms untouched."""
    shields: dict[str, str] = {}
    protected = text
    for index, term in enumerate(PROTECTED_TERMS):
        if term not in protected:
            continue
        token = f"KEEPTERM{index}KEEP"
        shields[token] = term
        protected = protected.replace(term, token)
    normalized = normalize_vi_text(protected)
    for token, term in shields.items():
        if token not in normalized:
            raise SystemExit(f"Normalizer changed the term {term!r}: {normalized}")
        normalized = normalized.replace(token, term)
    return normalized


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
        normalized = normalize_for_speech(segment["speech"])
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
    scenes = build_scenes(cues, duration_in_frames)
    display_end(cues, scenes)

    public = ROOT / "public"
    public.mkdir(parents=True, exist_ok=True)
    wav_path = public / "narration.wav"
    tts.save_audio(full, str(wav_path))
    timeline_path = ROOT / "src" / "timeline.ts"
    write_timeline(
        timeline_path,
        cues,
        scenes,
        sample_rate,
        audio_duration,
        duration_in_frames,
    )

    print(f"wrote {wav_path}  {audio_duration:.2f}s  {duration_in_frames} frames")
    for scene in scenes:
        print(
            f"  {scene['label']:16} {scene['startFrame']:5} + {scene['durationInFrames']:4}"
        )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
