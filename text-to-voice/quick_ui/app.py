"""Small local page: type text, pick a language and voice, play the audio.

    .venv/bin/python quick_ui/app.py

Then open http://127.0.0.1:8765

Languages and voices come from the loaded model, not a fixed list. ZeroTTS
currently ships Vietnamese only; a voice pack with another language code
shows up in the language menu on its own.
"""

from __future__ import annotations

import argparse
import io
import json
import threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, urlparse

import numpy as np
import soundfile as sf

from zerotts import ZeroTTS
from zerotts.audio import concat_with_silence
from zerotts.chunking import chunk_text, clean_segment_punctuation, normalize_punctuation
from zerotts.text_norm import normalize_vi_text

ROOT = Path(__file__).resolve().parents[1]
HERE = Path(__file__).resolve().parent
DEFAULT_MODEL = ROOT / "models" / "ZeroTTS"
PAGE = HERE / "index.html"

LANG_LABELS = {
    "vi": "Vietnamese",
    "en": "English",
    "zh": "Chinese",
    "ja": "Japanese",
    "ko": "Korean",
    "fr": "French",
    "de": "German",
    "es": "Spanish",
    "th": "Thai",
    "id": "Indonesian",
}
GENDER_LABELS = {
    "nữ": "Female",
    "nam": "Male",
}

MAX_CHARS = 4000
_tts: ZeroTTS | None = None
_voices: list[dict] = []
_lock = threading.Lock()


def lang_label(code: str) -> str:
    code = (code or "vi").lower()
    name = LANG_LABELS.get(code)
    return f"{name} ({code})" if name else code


def gender_label(code: str) -> str:
    if not code:
        return "Unspecified"
    return GENDER_LABELS.get(code, code)


def ordered_voice_names(tts: ZeroTTS) -> list[str]:
    available = set(tts.list_voices())
    index_path = tts.voices_root / "index.json"
    order: list[str] = []
    if index_path.is_file():
        data = json.loads(index_path.read_text())
        order = [v["name"] for v in data.get("voices", []) if v.get("name") in available]
    rest = sorted(available - set(order))
    return order + rest


def build_catalog(tts: ZeroTTS) -> list[dict]:
    voices = []
    for name in ordered_voice_names(tts):
        voice = tts.load_voice(name)
        voices.append({
            "name": voice.name,
            "display_name": voice.display_name,
            "language": voice.language or "vi",
            "gender": voice.gender,
            "gender_label": gender_label(voice.gender),
            "description": voice.description,
            "tags": voice.tags,
            "has_preview": bool(voice.preview_path),
        })
    return voices


def catalog_payload() -> dict:
    languages: dict[str, int] = {}
    genders: dict[str, str] = {}
    for voice in _voices:
        code = voice["language"]
        languages[code] = languages.get(code, 0) + 1
        if voice["gender"]:
            genders[voice["gender"]] = voice["gender_label"]
    return {
        "languages": [
            {"id": code, "label": lang_label(code), "count": count}
            for code, count in languages.items()
        ],
        "genders": [
            {"id": code, "label": label}
            for code, label in genders.items()
        ],
        "voices": _voices,
        "sample_rate": _tts.sample_rate if _tts else 48000,
    }


def voice_by_name(name: str) -> dict | None:
    for voice in _voices:
        if voice["name"] == name:
            return voice
    return None


def synthesize(text: str, voice_name: str) -> tuple[bytes, float, float]:
    import time

    voice = voice_by_name(voice_name)
    if voice is None:
        raise ValueError(f"Unknown voice {voice_name!r}")
    text = text.strip()
    if not text:
        raise ValueError("Enter some text to speak.")
    if len(text) > MAX_CHARS:
        raise ValueError(f"Keep the text under {MAX_CHARS} characters.")

    # Date and number expansion is Vietnamese. Apply it for Vietnamese voices
    # only, so a future non-Vietnamese pack is not read as Vietnamese words.
    if voice["language"] == "vi":
        text = normalize_vi_text(text)
    segments = [
        clean_segment_punctuation(part)
        for part in chunk_text(normalize_punctuation(text), max_chunk_sec=15)
    ]
    segments = [part for part in segments if part]
    if not segments:
        raise ValueError("Nothing left to speak after cleaning the text.")

    assert _tts is not None
    started = time.perf_counter()
    with _lock:
        chunks = [_tts.synthesize(part, voice=voice_name) for part in segments]
        audio = concat_with_silence(chunks, 0.15, _tts.sample_rate)
        sample_rate = _tts.sample_rate
    elapsed = time.perf_counter() - started
    samples = np.asarray(audio).squeeze()
    duration = float(samples.shape[-1]) / sample_rate if samples.size else 0.0
    buf = io.BytesIO()
    sf.write(buf, samples, sample_rate, format="WAV", subtype="PCM_16")
    return buf.getvalue(), duration, elapsed


def preview_bytes(voice_name: str) -> bytes:
    voice = voice_by_name(voice_name)
    if voice is None:
        raise ValueError(f"Unknown voice {voice_name!r}")
    assert _tts is not None
    loaded = _tts.load_voice(voice_name)
    if not loaded.preview_path:
        raise ValueError(f"{voice['display_name']} has no preview clip.")
    return Path(loaded.preview_path).read_bytes()


class Handler(BaseHTTPRequestHandler):
    def log_message(self, fmt: str, *args) -> None:
        print(f"[ui] {self.address_string()} {fmt % args}")

    def _send(self, status: int, body: bytes, content_type: str, extra: dict | None = None) -> None:
        self.send_response(status)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        for key, value in (extra or {}).items():
            self.send_header(key, value)
        self.end_headers()
        self.wfile.write(body)

    def _json(self, status: int, payload: dict) -> None:
        self._send(status, json.dumps(payload).encode(), "application/json; charset=utf-8")

    def do_GET(self) -> None:  # noqa: N802
        parsed = urlparse(self.path)
        if parsed.path == "/":
            self._send(200, PAGE.read_bytes(), "text/html; charset=utf-8")
            return
        if parsed.path == "/api/catalog":
            self._json(200, catalog_payload())
            return
        if parsed.path == "/api/preview":
            name = parse_qs(parsed.query).get("voice", [""])[0]
            try:
                wav = preview_bytes(name)
            except ValueError as exc:
                self._json(400, {"error": str(exc)})
                return
            self._send(200, wav, "audio/wav")
            return
        self._json(404, {"error": "Not found"})

    def do_POST(self) -> None:  # noqa: N802
        parsed = urlparse(self.path)
        if parsed.path != "/api/speak":
            self._json(404, {"error": "Not found"})
            return
        length = int(self.headers.get("Content-Length", "0") or 0)
        if length > 64_000:
            self._json(400, {"error": "Request is too large."})
            return
        try:
            payload = json.loads(self.rfile.read(length) or b"{}")
            wav, duration, elapsed = synthesize(
                str(payload.get("text", "")),
                str(payload.get("voice", "")),
            )
        except (ValueError, json.JSONDecodeError) as exc:
            self._json(400, {"error": str(exc)})
            return
        except Exception as exc:  # surface synthesis failures in the page
            self._json(500, {"error": str(exc)})
            return
        self._send(200, wav, "audio/wav", {
            "X-Duration": f"{duration:.2f}",
            "X-Elapsed": f"{elapsed:.2f}",
        })


def main() -> None:
    global _tts, _voices
    parser = argparse.ArgumentParser(description="ZeroTTS quick listen page")
    parser.add_argument("--model", default=str(DEFAULT_MODEL), help="Local model directory")
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=8765)
    args = parser.parse_args()

    model = Path(args.model).expanduser()
    if not model.is_dir():
        raise SystemExit(
            f"No model at {model}. Run a synthesis once so the weights are "
            f"copied there, or pass --model."
        )

    print(f"Loading {model} …", flush=True)
    _tts = ZeroTTS.from_pretrained(model)
    _voices = build_catalog(_tts)
    langs = ", ".join(item["label"] for item in catalog_payload()["languages"])
    print(f"{len(_voices)} voices · {langs}", flush=True)
    server = ThreadingHTTPServer((args.host, args.port), Handler)
    print(f"Open http://{args.host}:{args.port}", flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nStopped.")


if __name__ == "__main__":
    main()
