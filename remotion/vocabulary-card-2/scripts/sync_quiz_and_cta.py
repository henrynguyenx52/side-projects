#!/usr/bin/env python3
import json
from pathlib import Path

DATA_PATH = Path(__file__).resolve().parent.parent / "src" / "data" / "generated" / "say-tell.json"

with open(DATA_PATH, "r", encoding="utf-8") as f:
    data = json.load(f)

# 1. Update quiz data
data["quiz"]["question"] = "Did she _____ you what happened yesterday?"

quiz_scene = data["narration"]["scenes"][4]
assert quiz_scene["sceneId"] == "quiz"
quiz_scene["caption"] = "Did she _____ you what happened yesterday?\nA. SAY   B. TELL"
quiz_scene["text"] = "Thử sức nhé! Did she _____ you what happened yesterday? SAY hay TELL? Năm... Bốn... Ba... Hai... Một...! Đáp án là TELL! Vì có YOU ngay phía sau!"
quiz_scene["audioDurationSeconds"] = 8.43
quiz_scene["durationInFrames"] = 265
quiz_start = 1171 # quiz_scene["startFrame"]

# 2. Update CTA scene startFrame
cta_scene = data["narration"]["scenes"][5]
assert cta_scene["sceneId"] == "cta"
cta_start = quiz_start + 265 # 1436
cta_scene["startFrame"] = cta_start
cta_frames = cta_scene["durationInFrames"] # 391

total_frames = cta_start + cta_frames # 1827
data["config"]["totalDurationInFrames"] = total_frames
data["narration"]["totalAudioDurationSeconds"] = sum(s["audioDurationSeconds"] for s in data["narration"]["scenes"])

# 3. Update Subtitles for Quiz and CTA
# Quiz start is 1171, duration 265 frames (1171 - 1436)
# Subtitle timing:
# 1171 - 1198: "Thử sức nhé! Did she"
# 1198 - 1277: "_____ you what happened yesterday?"
# 1277 - 1307: "SAY hay TELL?"
# 1307 - 1354: "5... 4... 3... 2... 1...!"
# 1354 - 1395: "Đáp án là TELL!"
# 1395 - 1436: "Vì có YOU ngay phía sau!"

non_quiz_cta = [s for s in data["subtitles"] if s["sceneId"] not in ["quiz", "cta"]]

quiz_subs = [
    {
        "text": "Thử sức nhé! Did she",
        "startFrame": 1171,
        "endFrame": 1198,
        "sceneId": "quiz",
        "isKeyword": False
    },
    {
        "text": "_____ you what happened yesterday?",
        "startFrame": 1198,
        "endFrame": 1277,
        "sceneId": "quiz",
        "isKeyword": True
    },
    {
        "text": "SAY hay TELL?",
        "startFrame": 1277,
        "endFrame": 1307,
        "sceneId": "quiz",
        "isKeyword": True
    },
    {
        "text": "5... 4... 3... 2... 1...!",
        "startFrame": 1307,
        "endFrame": 1354,
        "sceneId": "quiz",
        "isKeyword": True
    },
    {
        "text": "Đáp án là TELL!",
        "startFrame": 1354,
        "endFrame": 1395,
        "sceneId": "quiz",
        "isKeyword": True
    },
    {
        "text": "Vì có YOU ngay phía sau!",
        "startFrame": 1395,
        "endFrame": 1436,
        "sceneId": "quiz",
        "isKeyword": False
    }
]

# Shift CTA subtitles by +3 frames (cta_start is 1436 instead of 1433)
cta_subs_old = [s for s in data["subtitles"] if s["sceneId"] == "cta"]
shift = 1436 - 1433 # +3
for s in cta_subs_old:
    s["startFrame"] += shift
    s["endFrame"] += shift

data["subtitles"] = non_quiz_cta + quiz_subs + cta_subs_old

with open(DATA_PATH, "w", encoding="utf-8") as f:
    json.dump(data, f, ensure_ascii=False, indent=2)

print(f"Updated say-tell.json: total duration {total_frames} frames ({total_frames/30:.2f}s)")

