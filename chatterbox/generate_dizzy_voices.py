#!/usr/bin/env python3
"""
Generate 'Dizzy' word and example sentence audio using Chatterbox TTS across all available voices.
Voices include:
  1. Chatterbox default built-in voice
  2. All 28 reference voices in ../kokoro/kokoro_voice_samples/
"""
import os
import sys
import time
import json
from pathlib import Path
import torch
import soundfile as sf
from chatterbox.tts import ChatterboxTTS

# 1. Device configuration for Apple Silicon (MPS with CPU fallback)
device = "mps" if torch.backends.mps.is_available() else "cpu"
map_location = torch.device(device)

torch_load_original = torch.load
def patched_torch_load(*args, **kwargs):
    if 'map_location' not in kwargs:
        kwargs['map_location'] = map_location
    return torch_load_original(*args, **kwargs)

torch.load = patched_torch_load

# 2. Paths
BASE_DIR = Path(__file__).resolve().parent
KOKORO_SAMPLES_DIR = BASE_DIR.parent / "kokoro" / "kokoro_voice_samples"
OUTPUT_DIR = BASE_DIR.parent / "remotion" / "vocabulary-card-2" / "public" / "audio" / "dizzy" / "chatterbox"
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

WORD_TEXT = "Dizzy."
SENTENCE_TEXT = "I feel dizzy and need to sit down."

def get_voice_info(file_stem: str):
    if file_stem == "default_builtin":
        return {
            "id": "default_builtin",
            "name": "Default Built-in",
            "gender": "Female",
            "accent": "US",
            "category": "Built-in"
        }
    
    parts = file_stem.split("_")
    prefix = parts[0]
    name = parts[1].capitalize() if len(parts) > 1 else file_stem
    
    accent = "American" if prefix[0] == "a" else ("British" if prefix[0] == "b" else "Other")
    gender = "Female" if prefix[1] == "f" else "Male"
    
    return {
        "id": file_stem,
        "name": f"{name} ({accent} {gender})",
        "gender": gender,
        "accent": accent,
        "category": f"{accent} {gender}"
    }

def main():
    import argparse
    parser = argparse.ArgumentParser(description="Generate 'Dizzy' audio across Chatterbox voices")
    parser.add_argument("--voice", type=str, default=None, help="Filter specific voice name")
    parser.add_argument("--limit", type=int, default=None, help="Limit number of voices")
    args = parser.parse_args()

    print(f"Loading ChatterboxTTS from local checkpoints on {device}...")
    t0 = time.time()
    ckpt_dir = BASE_DIR / "checkpoints"
    model = ChatterboxTTS.from_local(ckpt_dir, device=device)
    print(f"ChatterboxTTS loaded in {time.time() - t0:.2f}s.\n")

    # Build voice list
    voices = [{
        "id": "default_builtin",
        "ref_path": None,
        "info": get_voice_info("default_builtin")
    }]

    if KOKORO_SAMPLES_DIR.exists():
        for ref_file in sorted(KOKORO_SAMPLES_DIR.glob("*.wav")):
            voices.append({
                "id": ref_file.stem,
                "ref_path": str(ref_file),
                "info": get_voice_info(ref_file.stem)
            })

    if args.voice:
        voices = [v for v in voices if args.voice.lower() in v["id"].lower()]
    if args.limit:
        voices = voices[:args.limit]

    print(f"Total voices to synthesize: {len(voices)}")

    results = []
    
    for idx, v in enumerate(voices, 1):
        vid = v["id"]
        vinfo = v["info"]
        ref_path = v["ref_path"]
        print(f"[{idx}/{len(voices)}] Generating: {vinfo['name']} ({vid})...")
        
        word_out_path = OUTPUT_DIR / f"{vid}_word.wav"
        sentence_out_path = OUTPUT_DIR / f"{vid}_sentence.wav"

        t_start = time.time()
        try:
            # Prepare conditioning once per voice
            if ref_path:
                model.prepare_conditionals(ref_path, exaggeration=0.4)

            # Generate word "Dizzy."
            wav_word = model.generate(
                WORD_TEXT,
                exaggeration=0.4,
                cfg_weight=0.5,
                temperature=0.7
            )
            wav_word_np = wav_word.squeeze().cpu().numpy()
            sf.write(str(word_out_path), wav_word_np, model.sr)
            dur_word = len(wav_word_np) / model.sr

            # Generate sentence "I feel dizzy and need to sit down."
            wav_sentence = model.generate(
                SENTENCE_TEXT,
                exaggeration=0.4,
                cfg_weight=0.5,
                temperature=0.7
            )
            wav_sentence_np = wav_sentence.squeeze().cpu().numpy()
            sf.write(str(sentence_out_path), wav_sentence_np, model.sr)
            dur_sentence = len(wav_sentence_np) / model.sr

            print(f"  -> Generated word ({dur_word:.2f}s) & sentence ({dur_sentence:.2f}s) in {time.time() - t_start:.2f}s")
            
            results.append({
                "id": vid,
                "name": vinfo["name"],
                "category": vinfo["category"],
                "gender": vinfo["gender"],
                "accent": vinfo["accent"],
                "word_file": f"{vid}_word.wav",
                "sentence_file": f"{vid}_sentence.wav",
                "word_duration": round(dur_word, 2),
                "sentence_duration": round(dur_sentence, 2),
                "status": "success"
            })
        except Exception as e:
            print(f"  -> Error for {vid}: {e}")
            results.append({
                "id": vid,
                "name": vinfo["name"],
                "category": vinfo["category"],
                "status": f"error: {e}"
            })

    # Save summary metadata
    meta_path = OUTPUT_DIR / "voices_manifest.json"
    with open(meta_path, "w", encoding="utf-8") as f:
        json.dump(results, f, indent=2)

    # Generate HTML gallery
    generate_html_gallery(results, OUTPUT_DIR)
    print(f"\nDone! All files and HTML gallery saved to {OUTPUT_DIR}")

def generate_html_gallery(results, out_dir: Path):
    html = """<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Chatterbox TTS - 'Dizzy' Voice Gallery</title>
  <style>
    :root {
      --bg: #0f172a;
      --card-bg: #1e293b;
      --card-border: #334155;
      --text: #f8fafc;
      --text-muted: #94a3b8;
      --accent: #38bdf8;
      --badge-us: #3b82f6;
      --badge-uk: #8b5cf6;
      --badge-builtin: #10b981;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background: var(--bg);
      color: var(--text);
      padding: 2rem 1.5rem;
      min-height: 100vh;
    }
    header {
      max-width: 1200px;
      margin: 0 auto 2rem auto;
      text-align: center;
    }
    h1 {
      font-size: 2.2rem;
      font-weight: 700;
      color: #fff;
      margin-bottom: 0.5rem;
      background: linear-gradient(135deg, #38bdf8, #818cf8);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }
    p.subtitle {
      color: var(--text-muted);
      font-size: 1rem;
      margin-bottom: 1.5rem;
    }
    .filters {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
      justify-content: center;
      margin-bottom: 2rem;
    }
    .filter-btn {
      background: var(--card-bg);
      border: 1px solid var(--card-border);
      color: var(--text-muted);
      padding: 0.45rem 1rem;
      border-radius: 9999px;
      cursor: pointer;
      font-size: 0.85rem;
      transition: all 0.2s;
    }
    .filter-btn.active, .filter-btn:hover {
      background: var(--accent);
      color: #0f172a;
      font-weight: 600;
      border-color: var(--accent);
    }
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
      gap: 1.25rem;
      max-width: 1300px;
      margin: 0 auto;
    }
    .card {
      background: var(--card-bg);
      border: 1px solid var(--card-border);
      border-radius: 12px;
      padding: 1.25rem;
      display: flex;
      flex-direction: column;
      gap: 0.85rem;
      transition: transform 0.15s, border-color 0.15s;
    }
    .card:hover {
      transform: translateY(-2px);
      border-color: var(--accent);
    }
    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .voice-id {
      font-family: monospace;
      font-weight: 600;
      font-size: 1.1rem;
      color: #fff;
    }
    .badge {
      font-size: 0.75rem;
      padding: 0.2rem 0.55rem;
      border-radius: 9999px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .badge-us { background: rgba(59, 130, 246, 0.2); color: #60a5fa; border: 1px solid #3b82f6; }
    .badge-uk { background: rgba(139, 92, 246, 0.2); color: #a78bfa; border: 1px solid #8b5cf6; }
    .badge-builtin { background: rgba(16, 185, 129, 0.2); color: #34d399; border: 1px solid #10b981; }
    .audio-group {
      display: flex;
      flex-direction: column;
      gap: 0.4rem;
    }
    .audio-label {
      font-size: 0.8rem;
      font-weight: 500;
      color: var(--text-muted);
    }
    audio {
      width: 100%;
      height: 36px;
      border-radius: 6px;
    }
  </style>
</head>
<body>
  <header>
    <h1>Chatterbox TTS - 'Dizzy' Voice Gallery</h1>
    <p class="subtitle">Comparing word pronunciation and sentence cadence across all Chatterbox voices</p>
    <div class="filters">
      <button class="filter-btn active" onclick="filterCards('all')">All Voices (29)</button>
      <button class="filter-btn" onclick="filterCards('American Male')">American Male (10)</button>
      <button class="filter-btn" onclick="filterCards('American Female')">American Female (11)</button>
      <button class="filter-btn" onclick="filterCards('British Male')">British Male (4)</button>
      <button class="filter-btn" onclick="filterCards('British Female')">British Female (4)</button>
      <button class="filter-btn" onclick="filterCards('Built-in')">Built-in (1)</button>
    </div>
  </header>

  <main class="grid">
"""
    for r in results:
        if r.get("status") != "success":
            continue
        badge_cls = "badge-builtin" if "Built-in" in r["category"] else ("badge-us" if "American" in r["category"] else "badge-uk")
        html += f"""
    <div class="card" data-category="{r['category']}">
      <div class="card-header">
        <span class="voice-id">{r['id']}</span>
        <span class="badge {badge_cls}">{r['category']}</span>
      </div>
      <div class="audio-group">
        <div class="audio-label">Word: <strong>"Dizzy."</strong> ({r['word_duration']}s)</div>
        <audio controls preload="none" src="{r['word_file']}"></audio>
      </div>
      <div class="audio-group">
        <div class="audio-label">Sentence: <em>"I feel dizzy and need to sit down."</em> ({r['sentence_duration']}s)</div>
        <audio controls preload="none" src="{r['sentence_file']}"></audio>
      </div>
    </div>
"""

    html += """
  </main>
  <script>
    function filterCards(cat) {
      document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.toggle('active', btn.textContent.toLowerCase().includes(cat.toLowerCase()));
      });
      document.querySelectorAll('.card').forEach(card => {
        if (cat === 'all' || card.getAttribute('data-category') === cat) {
          card.style.display = 'flex';
        } else {
          card.style.display = 'none';
        }
      });
    }
  </script>
</body>
</html>
"""
    with open(out_dir / "index.html", "w", encoding="utf-8") as f:
        f.write(html)

if __name__ == "__main__":
    main()
