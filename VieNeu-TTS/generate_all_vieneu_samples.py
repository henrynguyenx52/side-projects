#!/usr/bin/env python3
import json
import re
import time
import unicodedata
from pathlib import Path
from vieneu import Vieneu

out_dir = Path("/Users/nguyenhuuhung/Documents/side-projects/vieneu_voice_samples")
out_dir.mkdir(parents=True, exist_ok=True)

with open("src/vieneu/assets/voices_v3_turbo.json", encoding="utf-8") as f:
    data = json.load(f)

presets = data.get("presets", {})

def slugify(s):
    # Vietnamese friendly transliteration
    replacements = {
        'đ': 'd', 'Đ': 'd', 'á': 'a', 'à': 'a', 'ả': 'a', 'ã': 'a', 'ạ': 'a',
        'ă': 'a', 'ắ': 'a', 'ằ': 'a', 'ẳ': 'a', 'ẵ': 'a', 'ặ': 'a',
        'â': 'a', 'ấ': 'a', 'ầ': 'a', 'ẩ': 'a', 'ẫ': 'a', 'ậ': 'a',
        'é': 'e', 'è': 'e', 'ẻ': 'e', 'ẽ': 'e', 'ẹ': 'e',
        'ê': 'e', 'ế': 'e', 'ề': 'e', 'ể': 'e', 'ễ': 'e', 'ệ': 'e',
        'í': 'i', 'ì': 'i', 'ỉ': 'i', 'ĩ': 'i', 'ị': 'i',
        'ó': 'o', 'ò': 'o', 'ỏ': 'o', 'õ': 'o', 'ọ': 'o',
        'ô': 'o', 'ố': 'o', 'ồ': 'o', 'ổ': 'o', 'ỗ': 'o', 'ộ': 'o',
        'ơ': 'o', 'ớ': 'o', 'ờ': 'o', 'ở': 'o', 'ỡ': 'o', 'ợ': 'o',
        'ú': 'u', 'ù': 'u', 'ủ': 'u', 'ũ': 'u', 'ụ': 'u',
        'ư': 'u', 'ứ': 'u', 'ừ': 'u', 'ử': 'u', 'ữ': 'u', 'ự': 'u',
        'ý': 'y', 'ỳ': 'y', 'ỷ': 'y', 'ỹ': 'y', 'ỵ': 'y'
    }
    for k, v in replacements.items():
        s = s.replace(k, v)
    s = unicodedata.normalize('NFKD', s).encode('ASCII', 'ignore').decode('utf-8')
    s = re.sub(r'[^a-zA-Z0-9]+', '_', s).strip('_').lower()
    return s

# Sort: featured first (1..10), then others alphabetically
sorted_presets = sorted(presets.items(), key=lambda x: (x[1].get('featured') or 99, x[0]))

print(f"Found {len(sorted_presets)} VieNeu-TTS preset voices.")
print("Initializing Vieneu v3 Turbo...")
tts = Vieneu()

sample_text = "Xin chào các con vợ, dạo này các con vợ có khoẻ không."

voice_metadata = []

for idx, (name, info) in enumerate(sorted_presets, 1):
    slug = slugify(name)
    filename = f"{slug}.wav"
    filepath = out_dir / filename
    
    gender = info.get("gender", "male")
    region = info.get("region", "Bắc")
    featured = info.get("featured")
    desc = info.get("description", "")
    
    print(f"[{idx}/{len(sorted_presets)}] Synthesizing '{name}' -> {filename}...")
    t0 = time.time()
    try:
        audio = tts.infer(sample_text, voice=name)
        tts.save(audio, str(filepath))
        elapsed = time.time() - t0
        print(f"  Done in {elapsed:.2f}s")
    except Exception as e:
        print(f"  Error for {name}: {e}")
        
    voice_metadata.append({
        "name": name,
        "filename": filename,
        "gender": gender,
        "region": region,
        "featured": featured,
        "description": desc
    })

with open(out_dir / "voices_metadata.json", "w", encoding="utf-8") as f:
    json.dump(voice_metadata, f, ensure_ascii=False, indent=2)

print("\nAll 25 voices generated successfully in:", str(out_dir))

