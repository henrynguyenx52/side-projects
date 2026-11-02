#!/usr/bin/env python3
import json
from pathlib import Path

DATA_PATH = Path(__file__).resolve().parent.parent / "src" / "data" / "generated" / "say-tell.json"

with open(DATA_PATH, "r", encoding="utf-8") as f:
    data = json.load(f)

# Update CTA scene
cta_scene = data["narration"]["scenes"][5]
assert cta_scene["sceneId"] == "cta"

cta_start = 1433
cta_frames = 391
cta_scene["startFrame"] = cta_start
cta_scene["durationInFrames"] = cta_frames
cta_scene["audioDurationSeconds"] = 12.63
cta_scene["text"] = "Giờ anh có một câu dành riêng cho em nhé! She _____ me that she loved him. SAY hay TELL? Comment đáp án bên dưới cho anh biết nhé! Anh sẽ kiểm tra xem có bao nhiêu người trả lời đúng. Đừng nhìn đáp án người khác đấy!"

total_frames = cta_start + cta_frames # 1824
data["config"]["totalDurationInFrames"] = total_frames
data["narration"]["totalAudioDurationSeconds"] = sum(s["audioDurationSeconds"] for s in data["narration"]["scenes"])

# Filter out old CTA subtitles and insert new ones
non_cta_subs = [s for s in data["subtitles"] if s["sceneId"] != "cta"]

cta_subs = [
    {
        "text": "Giờ anh có một câu",
        "startFrame": 1433,
        "endFrame": 1475,
        "sceneId": "cta",
        "isKeyword": False
    },
    {
        "text": "dành riêng cho em nhé!",
        "startFrame": 1475,
        "endFrame": 1515,
        "sceneId": "cta",
        "isKeyword": False
    },
    {
        "text": "She _____ me that she",
        "startFrame": 1515,
        "endFrame": 1560,
        "sceneId": "cta",
        "isKeyword": True
    },
    {
        "text": "loved him. SAY hay TELL?",
        "startFrame": 1560,
        "endFrame": 1610,
        "sceneId": "cta",
        "isKeyword": True
    },
    {
        "text": "Comment đáp án bên dưới",
        "startFrame": 1610,
        "endFrame": 1655,
        "sceneId": "cta",
        "isKeyword": False
    },
    {
        "text": "cho anh biết nhé! Anh",
        "startFrame": 1655,
        "endFrame": 1700,
        "sceneId": "cta",
        "isKeyword": False
    },
    {
        "text": "sẽ kiểm tra xem có",
        "startFrame": 1700,
        "endFrame": 1740,
        "sceneId": "cta",
        "isKeyword": False
    },
    {
        "text": "bao nhiêu người đúng nhé!",
        "startFrame": 1740,
        "endFrame": 1780,
        "sceneId": "cta",
        "isKeyword": False
    },
    {
        "text": "Đừng nhìn bài người khác!",
        "startFrame": 1780,
        "endFrame": 1824,
        "sceneId": "cta",
        "isKeyword": False
    }
]

data["subtitles"] = non_cta_subs + cta_subs

with open(DATA_PATH, "w", encoding="utf-8") as f:
    json.dump(data, f, ensure_ascii=False, indent=2)

print(f"Updated say-tell.json for CTA: total duration {total_frames} frames ({total_frames/30:.2f}s)")

