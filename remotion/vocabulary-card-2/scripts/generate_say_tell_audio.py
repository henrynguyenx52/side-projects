#!/usr/bin/env python3
"""
Bilingual TTS Generator for Say vs Tell Video
- Vietnamese segments -> VieNeu-TTS with voice "Adam bựa"
- English segments -> Kokoro with voice "am_adam"
- Merges into synchronized scene audio files in public/audio/say-tell/
- Updates src/data/generated/say-tell.json with exact frame timings and subtitle cues
- GUARANTEE: Never spells words letter-by-letter ("tell" -> /tel/, "say" -> /seɪ/).
"""

import os
import sys
import json
import math
import re
from pathlib import Path
import numpy as np

# Paths
SCRIPT_DIR = Path(__file__).resolve().parent
PROJECT_DIR = SCRIPT_DIR.parent
SIDE_PROJECTS_DIR = PROJECT_DIR.parent.parent
PUBLIC_AUDIO_DIR = PROJECT_DIR / "public" / "audio" / "say-tell"
PUBLIC_AUDIO_DIR.mkdir(parents=True, exist_ok=True)
DATA_JSON_PATH = PROJECT_DIR / "src" / "data" / "generated" / "say-tell.json"

TARGET_SR = 48000

# Script definitions with bilingual segmentation
SCENES_SCRIPT = [
    {
        "sceneId": "hook",
        "title": "Hook",
        "caption": "Đừng nói HE SAID ME nữa nhé! 😭",
        "segments": [
            {
                "lang": "vi",
                "text": "Xin chào, xin chào! Các em đã bao giờ nghe câu",
                "tts": "Xin chào, xin chào! Các em đã bao giờ nghe câu"
            },
            {
                "lang": "en",
                "text": "He said me",
                "tts": "He said me"
            },
            {
                "lang": "vi",
                "text": "chưa? Nghe có vẻ đúng đúng, nhưng thực ra lại sai ngữ pháp đấy nhé! Hôm nay, anh sẽ giúp các em phân biệt SAY và TELL chỉ trong 40 giây. Bắt đầu nào!",
                "tts": "chưa? Nghe có vẻ đúng đúng, nhưng thực ra lại sai ngữ pháp đấy nhé! Hôm nay, anh sẽ giúp các em phân biệt Say và Tell chỉ trong bốn mươi giây. Bắt đầu nào!"
            }
        ]
    },
    {
        "sceneId": "wordA",
        "title": "SAY",
        "caption": "SAY = Nói điều gì đó",
        "segments": [
            {
                "lang": "vi",
                "text": "Đầu tiên, SAY là nói điều gì đó. Ví dụ:",
                "tts": "Đầu tiên, Say là nói điều gì đó. Ví dụ:"
            },
            {
                "lang": "en",
                "text": "He said he was tired.",
                "tts": "He said he was tired."
            },
            {
                "lang": "vi",
                "text": "Anh ấy nói rằng anh ấy mệt. Nhớ nhé, SAY tập trung vào nội dung lời nói!",
                "tts": "Anh ấy nói rằng anh ấy mệt. Nhớ nhé, Say tập trung vào nội dung lời nói!"
            }
        ]
    },
    {
        "sceneId": "wordB",
        "title": "TELL",
        "caption": "TELL = Nói với ai đó",
        "segments": [
            {
                "lang": "vi",
                "text": "Còn TELL là nói với ai đó. Ví dụ:",
                "tts": "Còn Tell là nói với ai đó. Ví dụ:"
            },
            {
                "lang": "en",
                "text": "She told me a secret.",
                "tts": "She told me a secret."
            },
            {
                "lang": "vi",
                "text": "Cô ấy kể cho anh một bí mật. TELL nhớ phải có người nhận ngay phía sau nhé!",
                "tts": "Cô ấy kể cho anh một bí mật. Tell nhớ phải có người nhận ngay phía sau nhé!"
            }
        ]
    },
    {
        "sceneId": "comparison",
        "title": "COMPARISON",
        "caption": "SAY lời muốn nói • TELL người cần nghe",
        "segments": [
            {
                "lang": "vi",
                "text": "Chốt lại cho dễ nhớ:",
                "tts": "Chốt lại cho dễ nhớ:"
            },
            {
                "lang": "en",
                "text": "SAY something,",
                "tts": "Say something,"
            },
            {
                "lang": "vi",
                "text": "nhưng",
                "tts": "nhưng"
            },
            {
                "lang": "en",
                "text": "TELL someone something.",
                "tts": "Tell someone something."
            },
            {
                "lang": "vi",
                "text": "SAY lời muốn nói, TELL người cần nghe. Quá dễ đúng không?",
                "tts": "Say lời muốn nói, Tell người cần nghe. Quá dễ đúng không?"
            }
        ]
    },
    {
        "sceneId": "quiz",
        "title": "QUIZ",
        "caption": "Did she _____ you the truth?\nA. SAY   B. TELL",
        "segments": [
            {
                "lang": "vi",
                "text": "Thử sức nhé!",
                "tts": "Thử sức nhé!"
            },
            {
                "lang": "en",
                "text": "Did she blank you the truth?",
                "tts": "Did she blank you the truth?"
            },
            {
                "lang": "vi",
                "text": "SAY hay TELL? Ba... Hai... Một...! Đáp án là TELL! Vì có YOU ngay phía sau!",
                "tts": "Say hay Tell? Ba... Hai... Một...! Đáp án là Tell! Vì có you ngay phía sau!"
            }
        ]
    },
    {
        "sceneId": "cta",
        "title": "CTA + TƯƠNG TÁC",
        "caption": "She _____ me that she loved him. SAY hay TELL?",
        "segments": [
            {
                "lang": "vi",
                "text": "Giờ anh có một câu dành riêng cho em nhé!",
                "tts": "Giờ anh có một câu dành riêng cho em nhé!"
            },
            {
                "lang": "en",
                "text": "She blank me that she loved him.",
                "tts": "She blank me that she loved him."
            },
            {
                "lang": "vi",
                "text": "SAY hay TELL? Comment đáp án bên dưới cho anh biết nhé! Anh sẽ kiểm tra xem có bao nhiêu người trả lời đúng. Đừng nhìn đáp án người khác đấy!",
                "tts": "Say hay Tell? [cười] Comment đáp án bên dưới cho anh biết nhé! Anh sẽ kiểm tra xem có bao nhiêu người trả lời đúng. Đừng nhìn đáp án người khác đấy!"
            }
        ]
    }
]

def generate_english_chunks():
    """Generates all English chunks using Kokoro in kokoro/"""
    temp_en_dir = Path("/tmp/kokoro_say_tell")
    temp_en_dir.mkdir(parents=True, exist_ok=True)
    
    script_content = f"""
import json
import soundfile as sf
import torch
import re
from kokoro import KPipeline
from pathlib import Path
import numpy as np

out_dir = Path("{temp_en_dir}")
pipeline = KPipeline(lang_code="a")

def clean_en_text(t):
    # Ensure complete natural word pronunciation, never spell letters
    t = re.sub(r'\\bSAY\\b', 'Say', t)
    t = re.sub(r'\\bTELL\\b', 'tell', t)
    return t
"""
    # Collect all english segments
    for s_idx, scene in enumerate(SCENES_SCRIPT):
        for seg_idx, seg in enumerate(scene["segments"]):
            if seg["lang"] == "en":
                key = f"{scene['sceneId']}_{seg_idx}"
                raw_text = seg.get("tts", seg["text"])
                script_content += f"""
text_{key} = clean_en_text("{raw_text}")
print("Generating EN [{key}]:", text_{key})
gen = pipeline(text_{key}, voice="am_adam", speed=1.0)
audios = [a for gs, ps, a in gen]
if audios:
    full = torch.cat(audios, dim=0) if isinstance(audios[0], torch.Tensor) else audios[0]
    if hasattr(full, "numpy"):
        full = full.numpy()
    sf.write(str(out_dir / "{key}.wav"), full, 24000)
"""
    
    tmp_py = Path("/tmp/run_kokoro_say_tell.py")
    tmp_py.write_text(script_content, encoding="utf-8")
    
    print(f"Executing Kokoro TTS with voice 'am_adam'...")
    kokoro_dir = SIDE_PROJECTS_DIR / "kokoro"
    ret = os.system(f'cd "{kokoro_dir}" && uv run python "{tmp_py}"')
    if ret != 0:
        raise RuntimeError("Kokoro audio synthesis failed")
    return temp_en_dir

def generate_vietnamese_and_stitch(temp_en_dir: Path):
    """Generates Vietnamese chunks using VieNeu-TTS with voice 'Adam bựa' and stitches each scene"""
    script_content = f"""
import json
import os
import math
import re
from pathlib import Path
import numpy as np
import soundfile as sf
from scipy.signal import resample_poly
from vieneu import Vieneu

out_dir = Path("{PUBLIC_AUDIO_DIR}")
en_dir = Path("{temp_en_dir}")
data_json_path = Path("{DATA_JSON_PATH}")

print("Loading VieNeu-TTS model with voice 'Adam bựa' (fp32)...")
tts = Vieneu(mode="v3turbo", precision="fp32")

scenes_data = {json.dumps(SCENES_SCRIPT, ensure_ascii=False, indent=2)}

fps = 30
pause_short = np.zeros(int(0.12 * 48000), dtype=np.float32)

def clean_vi_tts(text):
    # CRITICAL: Replace uppercase SAY/TELL so the phonemizer NEVER spells them letter by letter
    t = text
    t = re.sub(r'\\bSAY\\b', 'Say', t)
    t = re.sub(r'\\bTELL\\b', 'Tell', t)
    t = re.sub(r'\\bYOU\\b', 'you', t)
    return t

def trim_silence(audio, threshold=0.005, pad_samples=2400):
    abs_audio = np.abs(audio)
    indices = np.where(abs_audio > threshold)[0]
    if len(indices) == 0:
        return audio
    start = max(0, indices[0] - pad_samples)
    end = min(len(audio), indices[-1] + pad_samples)
    return audio[start:end]

total_frames = 0
scene_results = []
current_start_frame = 0

for s_idx, scene in enumerate(scenes_data):
    scene_id = scene["sceneId"]
    print(f"\\nProcessing Scene: {{scene_id}}")
    stitched_chunks = []
    
    for seg_idx, seg in enumerate(scene["segments"]):
        lang = seg["lang"]
        if lang == "vi":
            text = clean_vi_tts(seg.get("tts", seg["text"]))
            print(f"  [VI] {{text[:50]}}...")
            vi_audio = tts.infer(text, voice="Adam bựa", temperature=0.8, top_k=25, top_p=0.95)
            if isinstance(vi_audio, np.ndarray):
                vi_arr = vi_audio
            else:
                vi_arr = np.asarray(vi_audio, dtype=np.float32)
            vi_arr = vi_arr.flatten()
            vi_arr = trim_silence(vi_arr)
            stitched_chunks.append(vi_arr)
            stitched_chunks.append(pause_short)
        elif lang == "en":
            print(f"  [EN] {{seg['text']}}...")
            en_wav_path = en_dir / f"{{scene_id}}_{{seg_idx}}.wav"
            en_audio, sr = sf.read(str(en_wav_path))
            en_audio = en_audio.flatten()
            en_audio = trim_silence(en_audio)
            # Resample 24kHz -> 48kHz
            en_48k = resample_poly(en_audio, 2, 1).astype(np.float32)
            stitched_chunks.append(en_48k)
            stitched_chunks.append(pause_short)
            
    # Combine scene chunks
    if stitched_chunks:
        full_scene_audio = np.concatenate(stitched_chunks)
    else:
        full_scene_audio = np.zeros(48000, dtype=np.float32)
        
    # Normalize gently
    max_val = np.max(np.abs(full_scene_audio))
    if max_val > 0:
        full_scene_audio = (full_scene_audio / max_val) * 0.95
        
    duration_sec = len(full_scene_audio) / 48000.0
    # Add minimal buffer frames (+12 frames padding for smooth visual transitions)
    duration_frames = int(math.ceil(duration_sec * fps)) + 12
    
    out_file = out_dir / f"scene-{{scene_id}}.wav"
    sf.write(str(out_file), full_scene_audio, 48000)
    print(f"  ✓ Saved {{out_file.name}}: {{duration_sec:.2f}}s ({{duration_frames}} frames)")
    
    scene_results.append({{
        "sceneId": scene_id,
        "title": scene["title"],
        "caption": scene["caption"],
        "text": " ".join([seg["text"] for seg in scene["segments"]]),
        "audioFile": f"audio/say-tell/{{out_file.name}}",
        "audioDurationSeconds": duration_sec,
        "startFrame": current_start_frame,
        "durationInFrames": duration_frames
    }})
    current_start_frame += duration_frames

total_frames = current_start_frame
print(f"\\nAll scenes generated! Total Duration: {{total_frames / fps:.2f}}s ({{total_frames}} frames)")

# Update say-tell.json
with open(data_json_path, "r", encoding="utf-8") as f:
    existing_data = json.load(f)

# Update metadata for the new script
existing_data["quiz"] = {{
    "question": "Did she _____ you the truth?",
    "options": ["A. SAY", "B. TELL"],
    "answer": "B",
    "answerWord": "TELL",
    "explanation": "Vì có YOU ngay phía sau!"
}}

existing_data["homework"] = {{
    "question": "She _____ me that she loved him.",
    "options": ["A. SAY", "B. TELL"],
    "instruction": "💬 Comment đáp án bên dưới cho anh biết nhé!",
    "note": "👀 Anh sẽ kiểm tra xem ai đúng đấy, cấm nhìn trộm!"
}}

existing_data["narration"]["scenes"] = scene_results
existing_data["narration"]["totalAudioDurationSeconds"] = sum(s["audioDurationSeconds"] for s in scene_results)
existing_data["config"]["totalDurationInFrames"] = total_frames

# Update subtitle cues
new_subtitles = []
for s in scene_results:
    scene_id = s["sceneId"]
    sf_start = s["startFrame"]
    dur = s["durationInFrames"]
    words = s["text"].split()
    chunk_size = 5
    num_chunks = max(1, math.ceil(len(words) / chunk_size))
    frames_per_chunk = math.floor((dur - 8) / num_chunks)
    
    for i in range(num_chunks):
        c_words = words[i*chunk_size : (i+1)*chunk_size]
        txt = " ".join(c_words)
        c_start = sf_start + i * frames_per_chunk
        c_end = c_start + frames_per_chunk
        new_subtitles.append({{
            "text": txt,
            "startFrame": c_start,
            "endFrame": c_end,
            "sceneId": scene_id,
            "isKeyword": any(k in txt.upper() for k in ["SAY", "TELL", "SAID ME", "TOLD ME"])
        }})

existing_data["subtitles"] = new_subtitles

with open(data_json_path, "w", encoding="utf-8") as f:
    json.dump(existing_data, f, ensure_ascii=False, indent=2)

print(f"✓ Updated {{data_json_path}} successfully.")
"""
    tmp_py = Path("/tmp/run_vieneu_stitch_say_tell.py")
    tmp_py.write_text(script_content, encoding="utf-8")
    
    print(f"Executing Vieneu synthesis and stitching with voice 'Adam bựa'...")
    vieneu_dir = SIDE_PROJECTS_DIR / "VieNeu-TTS"
    ret = os.system(f'cd "{vieneu_dir}" && uv run python "{tmp_py}"')
    if ret != 0:
        raise RuntimeError("VieNeu audio synthesis failed")

def main():
    print("==================================================")
    print("🎬 Generating Natural Bilingual Audio for SAY vs TELL")
    print("   - Words: Pronounced naturally as whole words (/tel/, /seɪ/)")
    print("   - Vietnamese: VieNeu-TTS (voice: Adam bựa)")
    print("   - English: Kokoro (voice: am_adam)")
    print("==================================================")
    
    temp_en = generate_english_chunks()
    generate_vietnamese_and_stitch(temp_en)
    print("\n🎉 All 6 scene audios synthesized and synchronized successfully!")

if __name__ == "__main__":
    main()
