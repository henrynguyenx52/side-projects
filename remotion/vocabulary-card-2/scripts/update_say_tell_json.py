#!/usr/bin/env python3
import json
from pathlib import Path

DATA_PATH = Path(__file__).resolve().parent.parent / "src" / "data" / "generated" / "say-tell.json"

with open(DATA_PATH, "r", encoding="utf-8") as f:
    data = json.load(f)

# 1. Update quiz scene metadata
quiz_scene = data["narration"]["scenes"][4]
assert quiz_scene["sceneId"] == "quiz"
quiz_scene["text"] = "Thử sức nhé! Did she _____ you the truth? SAY hay TELL? Năm... Bốn... Ba... Hai... Một...! Đáp án là TELL! Vì có YOU ngay phía sau!"
quiz_scene["audioDurationSeconds"] = 8.312
quiz_scene["durationInFrames"] = 262
quiz_start = quiz_scene["startFrame"] # 1171

# 2. Update CTA scene startFrame
cta_scene = data["narration"]["scenes"][5]
assert cta_scene["sceneId"] == "cta"
delta_frames = 262 - 251 # +11 frames
cta_scene["startFrame"] = quiz_start + 262 # 1433
total_frames = cta_scene["startFrame"] + cta_scene["durationInFrames"] # 1433 + 409 = 1842

data["config"]["totalDurationInFrames"] = total_frames
data["narration"]["totalAudioDurationSeconds"] = sum(s["audioDurationSeconds"] for s in data["narration"]["scenes"])

# 3. Update Subtitles for Quiz and CTA
# Quiz duration is 262 frames (start: 1171, end: 1433)
# Segments:
# 1171 - 1205: "Thử sức nhé! Did she"
# 1205 - 1255: "_____ you the truth?"
# 1255 - 1300: "SAY hay TELL?"
# 1300 - 1340: "5... 4... 3... 2... 1...!"
# 1340 - 1385: "Đáp án là TELL!"
# 1385 - 1433: "Vì có YOU ngay phía sau!"

new_subtitles = []
for sub in data["subtitles"]:
    if sub["sceneId"] == "quiz":
        continue
    elif sub["sceneId"] == "cta":
        # Shift cta by +11 frames
        sub["startFrame"] += delta_frames
        sub["endFrame"] += delta_frames
        if "blank" in sub["text"]:
            sub["text"] = sub["text"].replace("blank", "_____")
        new_subtitles.append(sub)
    else:
        new_subtitles.append(sub)

quiz_subs = [
    {
        "text": "Thử sức nhé! Did she",
        "startFrame": 1171,
        "endFrame": 1205,
        "sceneId": "quiz",
        "isKeyword": False
    },
    {
        "text": "_____ you the truth?",
        "startFrame": 1205,
        "endFrame": 1255,
        "sceneId": "quiz",
        "isKeyword": True
    },
    {
        "text": "SAY hay TELL?",
        "startFrame": 1255,
        "endFrame": 1295,
        "sceneId": "quiz",
        "isKeyword": True
    },
    {
        "text": "5... 4... 3... 2... 1...!",
        "startFrame": 1295,
        "endFrame": 1341,
        "sceneId": "quiz",
        "isKeyword": True
    },
    {
        "text": "Đáp án là TELL!",
        "startFrame": 1341,
        "endFrame": 1385,
        "sceneId": "quiz",
        "isKeyword": True
    },
    {
        "text": "Vì có YOU ngay phía sau!",
        "startFrame": 1385,
        "endFrame": 1433,
        "sceneId": "quiz",
        "isKeyword": False
    }
]

# Insert quiz subtitles at proper index
# Find where sceneId != 'hook', 'wordA', 'wordB', 'comparison'
insert_idx = 0
for idx, s in enumerate(new_subtitles):
    if s["sceneId"] == "cta":
        insert_idx = idx
        break

all_subs = new_subtitles[:insert_idx] + quiz_subs + new_subtitles[insert_idx:]
data["subtitles"] = all_subs

with open(DATA_PATH, "w", encoding="utf-8") as f:
    json.dump(data, f, ensure_ascii=False, indent=2)

print(f"Updated {DATA_PATH.name} successfully!")
print(f"New total duration: {total_frames} frames ({total_frames/30:.2f}s)")
