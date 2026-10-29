#!/usr/bin/env python3
"""Cut the nine sketches, synthesize the approved narration, write the boards."""

import asyncio
import json
import subprocess
from collections import deque
from html import escape
from pathlib import Path

import edge_tts
from PIL import Image

ROOT = Path("/Users/hungnguyen/Documents/side-projects/videos/tham-nach-khuyu")
ASSETS = Path("/Users/hungnguyen/.cursor/projects/Users-hungnguyen-Documents-side-projects/assets")
VOICE = "vi-VN-HoaiMyNeural"

SCENES = [
    {
        "id": "hook",
        "file": "tran_ni_P-MVPCXX6D-G4U5_9_-n8uqj-f746a7ab-772b-4a88-91b4-e2b053eb7e33.jpg",
        "erase_right": 0,
        "title": 'KHÔNG PHẢI <span class="blue">BẨN</span>',
        "notes": ["Chà và chanh", "Càng viêm càng sẫm"],
        "line": "Nách và khuỷu trông thâm không phải vì bẩn. Chà mạnh hay bôi chanh chỉ làm da viêm, rồi càng dễ sẫm.",
    },
    {
        "id": "cause",
        "file": "tran_ni_P-MVPCXX6E-ZPIP_8_-o4bbw-a1bda9a4-abfa-40d6-a11a-435c0258b824.jpg",
        "erase_right": 0.18,
        "title": 'Cọ, cạo, <span class="blue">dị ứng</span>',
        "notes": ["Da làm thêm sắc tố", "Có thể đậm vài tháng"],
        "line": "Da bị cọ, bị cạo, hoặc bị dị ứng sẽ viêm. Khi lành, da làm thêm sắc tố. Màu đậm có thể ở lại vài tháng, và chỉ nhạt khi hết kích ứng.",
    },
    {
        "id": "armpit",
        "file": "tran_ni_P-MVPCXX6F-RD0B_7_-16n9a-a453c6db-5c81-4cec-840b-e96b894f1125.jpg",
        "erase_right": 0,
        "title": 'Nách da <span class="blue">mỏng</span>',
        "notes": ["Cạo làm yếu hàng rào", "Thâm là vết viêm"],
        "line": "Với nách thì da mỏng, nhiều mồ hôi, hàng rào yếu. Cạo hoặc nhổ lông bóc lớp bảo vệ, nên lăn khử mùi dễ ngấm và dễ rát. Thâm đó là vết viêm, không phải bụi.",
    },
    {
        "id": "elbow",
        "file": "tran_ni_P-MVPCXX6G-QRC1_6_-6cwbf-d7488b68-1d64-4fec-8f33-9167b11229d0.jpg",
        "erase_right": 0.2,
        "title": 'Khuỷu da <span class="blue">dày</span>',
        "notes": ["Tế bào chết xếp lớp", "Cần làm mềm"],
        "line": "Khuỷu thì ngược lại. Da dày, tế bào chết xếp nhiều lớp, lại hay tì bàn, nên nhìn xám nâu. Khuỷu cần được làm mềm, không cần kỳ đến đỏ.",
    },
    {
        "id": "avoid",
        "file": "tran_ni_P-MVPCXX6H-XKPP_5_-m04mm-533ee85d-acbf-4441-b1ce-ebf7aa7af731.jpg",
        "erase_right": 0.16,
        "title": 'Tránh <span class="blue">chanh</span>',
        "notes": ["Tránh đá bọt", "Da ngăm dễ sẫm"],
        "line": "Vì vậy đừng bôi chanh, đừng kỳ đá bọt, và đừng tự bôi kem trắng mạnh. Những thứ này làm rát. Da ngăm lại càng dễ để đốm sẫm sau trầy xước.",
    },
    {
        "id": "loose",
        "file": "tran_ni_P-MVPCXX6I-U2A8_4_-oh9ac-b0964879-5ed6-49b4-ad04-75bfde2854e3.jpg",
        "erase_right": 0,
        "title": 'Đồ <span class="blue">rộng</span>',
        "notes": ["Đừng cạo khô", "Lăn không hương liệu"],
        "line": "Nách thì làm thế này: mặc đồ rộng cho hết cọ. Cạo thưa hơn, dao sắc, đừng cạo khô. Lăn nào rát thì đổi sang loại không hương liệu. Rửa dịu, và đừng kỳ.",
    },
    {
        "id": "soften",
        "file": "tran_ni_P-MVPCXX6J-KVDS_3_-jxy15-477e1c07-b7ae-4c61-b792-fe677bf8510d.jpg",
        "erase_right": 0,
        "title": 'Dưỡng sau <span class="blue">tắm</span>',
        "notes": ["Kỳ nhẹ nửa phút", "Rồi dưỡng ngay"],
        "line": "Khuỷu thì làm thế này: sau mỗi lần tắm, thoa kem dưỡng dịu. Nếu có kỳ, chỉ nhẹ khoảng nửa phút, rồi dưỡng ngay, kẻo da khô lại tối.",
    },
    {
        "id": "clinic",
        "file": "tran_ni_P-MVPCXX6K-EVUU_2_-huwz5-44c8872b-5f9c-458a-8b3a-fe37ceb1e80a.jpg",
        "erase_right": 0.14,
        "title": 'Dày như <span class="blue">nhung</span>',
        "notes": ["Nách và cổ", "Đi khám, đừng chà"],
        "line": "Còn nếu da dày, sẫm, mượt như nhung ở cả nách và cổ, thường liên quan insulin cao. Kem dưỡng không xử lý được. Hãy đi khám, đừng chà.",
    },
    {
        "id": "close",
        "file": "tran_ni_P-MVPD8TDB-5V8Z_1_-at9ey-2b7052a9-20aa-46bb-ba47-01dcd028e717.jpg",
        "erase_right": 0.16,
        "title": 'Ngừng <span class="blue">kích ứng</span>',
        "notes": ["Dưỡng mỗi ngày", "Vài tháng, không một đêm"],
        "line": "Tóm lại: ngừng thứ làm rát, giảm ma sát, dưỡng mỗi ngày. Da có thể mất vài tháng mới nhạt. Không có mẹo một đêm.",
    },
]

HOT = {
    "bẩn", "chanh", "sẫm", "viêm", "sắc", "tháng", "mỏng", "cạo", "rát",
    "mềm", "bọt", "ngăm", "rộng", "khô", "hương", "dưỡng", "phút", "nhung",
    "insulin", "khám", "ngày", "đêm", "sát",
}

FONTS = """
    @font-face { font-family: Text; font-style: normal; font-weight: 600; font-display: block; src: url("assets/fonts/bevn-600-00.woff2") format("woff2"); unicode-range: U+0102-0103, U+0110-0111, U+0128-0129, U+0168-0169, U+01A0-01A1, U+01AF-01B0, U+0300-0301, U+0303-0304, U+0308-0309, U+0323, U+0329, U+1EA0-1EF9, U+20AB; }
    @font-face { font-family: Text; font-style: normal; font-weight: 600; font-display: block; src: url("assets/fonts/bevn-600-01.woff2") format("woff2"); unicode-range: U+0100-02BA, U+02BD-02C5, U+02C7-02CC, U+02CE-02D7, U+02DD-02FF, U+0304, U+0308, U+0329, U+1D00-1DBF, U+1E00-1E9F, U+1EF2-1EFF, U+2020, U+20A0-20AB, U+20AD-20C4, U+2113, U+2C60-2C7F, U+A720-A7FF; }
    @font-face { font-family: Text; font-style: normal; font-weight: 600; font-display: block; src: url("assets/fonts/bevn-600-02.woff2") format("woff2"); unicode-range: U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD; }
    @font-face { font-family: Text; font-style: normal; font-weight: 700; font-display: block; src: url("assets/fonts/bevn-700-03.woff2") format("woff2"); unicode-range: U+0102-0103, U+0110-0111, U+0128-0129, U+0168-0169, U+01A0-01A1, U+01AF-01B0, U+0300-0301, U+0303-0304, U+0308-0309, U+0323, U+0329, U+1EA0-1EF9, U+20AB; }
    @font-face { font-family: Text; font-style: normal; font-weight: 700; font-display: block; src: url("assets/fonts/bevn-700-04.woff2") format("woff2"); unicode-range: U+0100-02BA, U+02BD-02C5, U+02C7-02CC, U+02CE-02D7, U+02DD-02FF, U+0304, U+0308, U+0329, U+1D00-1DBF, U+1E00-1E9F, U+1EF2-1EFF, U+2020, U+20A0-20AB, U+20AD-20C4, U+2113, U+2C60-2C7F, U+A720-A7FF; }
    @font-face { font-family: Text; font-style: normal; font-weight: 700; font-display: block; src: url("assets/fonts/bevn-700-05.woff2") format("woff2"); unicode-range: U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD; }
"""

BOARD_CSS = FONTS + """
    #root {
      position: absolute;
      inset: 0;
      overflow: hidden;
      background: #f6f3ec;
      font-family: Text, sans-serif;
      color: #1c1c1c;
    }
    .kicker {
      position: absolute;
      top: 196px;
      left: 0;
      right: 0;
      text-align: center;
      font-weight: 600;
      font-size: 28px;
      letter-spacing: 0.22em;
      color: #6f6a63;
    }
    .slot { position: absolute; inset: auto; }
    .title {
      top: 258px;
      left: 108px;
      width: 864px;
      font-weight: 700;
      font-size: 64px;
      line-height: 1.15;
      white-space: nowrap;
    }
    .note {
      left: 108px;
      width: 864px;
      font-weight: 600;
      font-size: 40px;
      line-height: 72px;
      white-space: nowrap;
    }
    .wipe { display: inline-block; clip-path: inset(0 100% 0 0); }
    .blue { color: #1d4f8a; }
    .pic { overflow: hidden; }
    .pic img { display: block; width: 100%; height: 100%; }
    .shade {
      position: absolute;
      inset: 0;
      --sweep: 0;
      -webkit-mask-image: conic-gradient(from -90deg at 50% 50%, #000 calc(var(--sweep) * 1deg), transparent calc(var(--sweep) * 1deg));
      mask-image: conic-gradient(from -90deg at 50% 50%, #000 calc(var(--sweep) * 1deg), transparent calc(var(--sweep) * 1deg));
    }
    .hand {
      position: absolute;
      left: 0;
      top: 0;
      width: 230px;
      height: 348px;
      z-index: 8;
      opacity: 0;
      pointer-events: none;
    }
"""


def is_paper(r, g, b, a):
    if a < 8:
        return True
    mn, mx = min(r, g, b), max(r, g, b)
    return mn >= 226 and (mx - mn) <= 24


def cutout(src: Path, dest: Path, erase_right: float):
    im = Image.open(src).convert("RGBA")
    w, h = im.size
    px = im.load()
    paper = (246, 243, 236, 255)
    if erase_right:
        x0 = int(w * (1 - erase_right))
        for y in range(h):
            for x in range(x0, w):
                px[x, y] = paper
    for y in range(h - 48, h):
        for x in range(w - 48, w):
            px[x, y] = paper
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if is_paper(r, g, b, a):
                px[x, y] = (0, 0, 0, 0)
    seen = bytearray(w * h)
    keep = bytearray(w * h)
    for y in range(h):
        for x in range(w):
            i = y * w + x
            if seen[i] or px[x, y][3] == 0:
                continue
            q = deque([(x, y)])
            seen[i] = 1
            cells = [(x, y)]
            while q:
                cx, cy = q.popleft()
                for nx, ny in ((cx + 1, cy), (cx - 1, cy), (cx, cy + 1), (cx, cy - 1)):
                    if 0 <= nx < w and 0 <= ny < h:
                        j = ny * w + nx
                        if not seen[j] and px[nx, ny][3] > 0:
                            seen[j] = 1
                            q.append((nx, ny))
                            cells.append((nx, ny))
            if len(cells) >= 180:
                for cx, cy in cells:
                    keep[cy * w + cx] = 1
    for y in range(h):
        for x in range(w):
            if not keep[y * w + x]:
                px[x, y] = (0, 0, 0, 0)
    bbox = im.getbbox()
    im = im.crop(bbox)
    pad = 16
    out = Image.new("RGBA", (im.width + pad * 2, im.height + pad * 2), (0, 0, 0, 0))
    out.paste(im, (pad, pad), im)
    out.save(dest)
    return out.size


def measure_hand():
    im = Image.open(ROOT / "assets/sketches/hand.png").convert("RGBA")
    w, h = im.size
    px = im.load()
    best = None
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if a < 20:
                continue
            lum = (r + g + b) / 3
            if lum < 120 and (best is None or x < best[0] or (x == best[0] and y < best[1])):
                best = (x, y)
    return w, h, best


def ffprobe_duration(path: Path) -> float:
    out = subprocess.check_output(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "json", str(path)],
        text=True,
    )
    return float(json.loads(out)["format"]["duration"])


async def speak_piece(text: str):
    last_error = None
    for attempt in range(3):
        try:
            communicate = edge_tts.Communicate(text, VOICE, rate="-6%", boundary="WordBoundary")
            words = []
            audio_bytes = bytearray()
            async for chunk in communicate.stream():
                if chunk["type"] == "audio":
                    audio_bytes.extend(chunk["data"])
                elif chunk["type"] == "WordBoundary":
                    offset = float(chunk["offset"])
                    duration = float(chunk["duration"])
                    if offset > 500:
                        offset /= 1e7
                        duration /= 1e7
                    token = chunk["text"].strip()
                    if token:
                        words.append({"text": token, "start": offset, "end": offset + duration})
            if audio_bytes and words:
                return bytes(audio_bytes), words
        except Exception as error:
            last_error = error
        await asyncio.sleep(1.5 + attempt)
    raise RuntimeError(f"TTS failed for: {text}") from last_error


async def speak(text: str, mp3: Path, words_path: Path):
    if words_path.exists() and mp3.with_suffix(".wav").exists():
        return json.loads(words_path.read_text(encoding="utf-8"))
    pieces = [part.strip() for part in text.replace(":", ".").split(".") if part.strip()]
    words = []
    shift = 0.0
    for index, piece in enumerate(pieces):
        part = mp3.with_name(f"{mp3.stem}-{index}.mp3")
        part_wav = part.with_suffix(".wav")
        part_json = mp3.with_name(f"{mp3.stem}-{index}.json")
        if part_wav.exists() and part_json.exists():
            piece_words = json.loads(part_json.read_text(encoding="utf-8"))
        else:
            data, piece_words = await speak_piece(piece + ".")
            part.write_bytes(data)
            to_wav(part, part_wav)
            part_json.write_text(json.dumps(piece_words, ensure_ascii=False), encoding="utf-8")
            await asyncio.sleep(1.2)
        length = ffprobe_duration(part_wav)
        for word in piece_words:
            words.append({
                "text": word["text"],
                "start": word["start"] + shift,
                "end": word["end"] + shift,
            })
        shift += length
    words_path.write_text(json.dumps(words, ensure_ascii=False), encoding="utf-8")
    mp3.write_bytes(b"done")
    return words


def to_wav(mp3: Path, wav: Path):
    subprocess.check_call(
        ["ffmpeg", "-y", "-i", str(mp3), "-ar", "24000", "-ac", "1", "-c:a", "pcm_s16le", str(wav)],
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )


def fit_box(w, h):
    max_w, max_h = 760, 500
    scale = min(max_w / w, max_h / h)
    dw, dh = max(1, int(w * scale)), max(1, int(h * scale))
    left = 108 + (864 - dw) // 2
    top = 440 + (500 - dh) // 2
    return left, top, dw, dh


def caption_lines(words):
    lines = []
    cur = []
    for word in words:
        if not word["text"]:
            continue
        cur.append(word)
        text = " ".join(item["text"] for item in cur)
        dur = cur[-1]["end"] - cur[0]["start"]
        end = word["text"][-1] in ".:,;"
        if len(text) >= 24 or dur >= 1.2 or end:
            lines.append(cur)
            cur = []
    if cur:
        lines.append(cur)
    return lines


def rich_line(words):
    parts = []
    marked = False
    for word in words:
        token = word["text"].strip(".,:;!?").lower()
        if not marked and token in HOT:
            parts.append(f'<span class="hot">{escape(word["text"])}</span>')
            marked = True
        else:
            parts.append(escape(word["text"]))
    return " ".join(parts)


def board_html(scene, hand):
    sid = scene["id"]
    dur = scene["dur"]
    left, top, dw, dh = scene["box"]
    trace_at = 0.7
    trace_dur = 1.35
    note_at = trace_at + trace_dur + 0.15
    hw, hh, tip = hand
    tip_x, tip_y = tip
    hand_h = round(230 * hh / hw)
    notes_html = []
    note_js = []
    for i, note in enumerate(scene["notes"]):
        y = 1120 + i * 72
        at = round(note_at + i * 0.85, 3)
        notes_html.append(
            f'<div id="{sid}-n{i}" class="clip slot note" data-start="{at}" data-duration="{round(dur - at, 3)}" style="top: {y}px"><span class="wipe">{escape(note)}</span></div>'
        )
        note_js.append(f'write("#{sid}-n{i} .wipe", {at}, 0.42);')
    return f"""<template>
  <style>
{BOARD_CSS}
    .hand {{ height: {hand_h}px; }}
  </style>
  <div id="root" data-composition-id="{sid}" data-width="1080" data-height="1920" data-layout-allow-overlap>
    <div class="kicker">MẸO DA</div>
    <div id="{sid}-title" class="clip slot title" data-start="0.1" data-duration="{round(dur - 0.1, 3)}">
      <span class="wipe">{scene["title"]}</span>
    </div>
    <div id="{sid}-pic" class="clip slot pic" data-start="{trace_at}" data-duration="{round(dur - trace_at, 3)}" style="left: {left}px; top: {top}px; width: {dw}px; height: {dh}px">
      <div id="{sid}-shade" class="shade"><img src="assets/sketches/{sid}.png" alt="" /></div>
    </div>
    {"".join(notes_html)}
    <img id="{sid}-hand" class="hand" src="assets/sketches/hand.png" alt="" data-layout-allow-overflow />
  </div>
  <script>
    const HAND_W = 230;
    const TIP_X = {tip_x} * (HAND_W / {hw});
    const TIP_Y = {tip_y} * (HAND_W / {hw});
    const tl = gsap.timeline({{ paused: true }});
    const hand = "#{sid}-hand";
    function write(sel, at, dur) {{
      tl.fromTo(sel, {{ clipPath: "inset(0 100% 0 0)" }}, {{
        clipPath: "inset(0 0% 0 0)", duration: dur, ease: "power1.out", immediateRender: false,
      }}, at);
    }}
    function trace(shade, box, at, dur) {{
      const cx = box.x + box.w / 2;
      const cy = box.y + box.h / 2;
      const rx = box.w * 0.46;
      const ry = box.h * 0.46;
      tl.fromTo(shade, {{ "--sweep": 0 }}, {{
        "--sweep": 360,
        duration: dur,
        ease: "none",
        immediateRender: false,
        onUpdate() {{
          const a = this.progress() * Math.PI * 2;
          gsap.set(hand, {{
            opacity: 1,
            x: cx + rx * Math.sin(a) - TIP_X,
            y: cy - ry * Math.cos(a) - TIP_Y,
          }});
        }},
      }}, at);
      tl.set(hand, {{ opacity: 0 }}, at + dur);
    }}
    write("#{sid}-title .wipe", 0.1, 0.5);
    trace("#{sid}-shade", {{ x: {left}, y: {top}, w: {dw}, h: {dh} }}, {trace_at}, {trace_dur});
    {"".join(note_js)}
    window.__timelines["{sid}"] = tl;
  </script>
</template>
"""


def captions_html(rows, total):
    blocks = []
    groups = []
    for i, row in enumerate(rows):
        start = row["start"]
        end = row["end"]
        cid = f"c{i:02d}"
        blocks.append(
            f'<div id="{cid}" class="clip cap low" data-start="{start:.3f}" data-duration="{end - start:.3f}" data-track-index="0"><div class="line">{row["html"]}</div></div>'
        )
        groups.append(f'["{cid}", {start:.3f}, {end:.3f}]')
    return f"""<template>
  <style>
{FONTS}
    #root {{ position: absolute; inset: 0; overflow: visible; pointer-events: none; }}
    .cap {{ position: absolute; left: 72px; right: 72px; top: 1580px; text-align: center; z-index: 5; }}
    .line {{
      display: inline-block;
      opacity: 0;
      font-family: Text, sans-serif;
      font-weight: 600;
      font-size: 36px;
      line-height: 1.2;
      color: #4e4a45;
    }}
    .hot {{ color: #1d4f8a; }}
  </style>
  <div id="root" data-composition-id="captions" data-width="1080" data-height="1920" data-layout-allow-overlap>
    {"".join(blocks)}
  </div>
  <script>
    const groups = [{", ".join(groups)}];
    const tl = gsap.timeline({{ paused: true }});
    for (const [id, start, end] of groups) {{
      const line = "#" + id + " .line";
      tl.set(line, {{ visibility: "visible" }}, start);
      tl.fromTo(line, {{ opacity: 0, y: 16 }}, {{
        opacity: 1, y: 0, duration: 0.16, ease: "power3.out", immediateRender: false,
      }}, start);
      tl.to(line, {{ opacity: 0, duration: 0.1, ease: "power2.in" }}, Math.max(start, end - 0.1));
      tl.set(line, {{ opacity: 0, visibility: "hidden" }}, Math.max(start, end - 0.02));
    }}
    window.__timelines["captions"] = tl;
  </script>
</template>
"""


def index_html(scenes, total):
    hosts = []
    cursor = 0.0
    for scene in scenes:
        hosts.append(
            f'''      <div
        id="{scene["id"]}"
        data-composition-id="{scene["id"]}"
        data-composition-src="compositions/{scene["id"]}.html"
        data-start="{cursor:.3f}"
        data-duration="{scene["dur"]:.3f}"
        data-track-index="1"
        data-track-kind="graphics"
        data-width="1080"
        data-height="1920"
        style="z-index: 1"
      ></div>'''
        )
        cursor += scene["dur"]
    return f"""<!doctype html>
<html lang="vi" data-resolution="portrait">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=1080, height=1920" />
    <script src="https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js"></script>
    <style>
      * {{ margin: 0; padding: 0; box-sizing: border-box; }}
      html, body {{ margin: 0; width: 1080px; height: 1920px; overflow: hidden; background: #f6f3ec; }}
    </style>
  </head>
  <body>
    <div id="root" data-composition-id="main" data-start="0" data-duration="{total:.3f}" data-width="1080" data-height="1920">
{chr(10).join(hosts)}
      <div
        id="captions"
        data-composition-id="captions"
        data-composition-src="compositions/captions.html"
        data-start="0"
        data-duration="{total:.3f}"
        data-track-index="3"
        data-track-kind="captions"
        data-width="1080"
        data-height="1920"
        style="z-index: 4"
      ></div>
      <audio id="voiceover" src="assets/narration.wav" data-start="0" data-duration="{total:.3f}" data-track-index="2" data-volume="1"></audio>
    </div>
    <script>
      window.__timelines["main"] = gsap.timeline({{ paused: true }});
    </script>
  </body>
</html>
"""


async def main():
    hand = measure_hand()
    print("hand", hand)
    sketch_dir = ROOT / "assets/sketches"
    audio_dir = ROOT / "assets/audio"
    audio_dir.mkdir(parents=True, exist_ok=True)
    for scene in SCENES:
        src = ASSETS / scene["file"]
        dest = sketch_dir / f"{scene['id']}.png"
        if dest.exists():
            size = Image.open(dest).size
        else:
            size = cutout(src, dest, scene["erase_right"])
        scene["png"] = size
        scene["box"] = fit_box(*size)
        print("cut", scene["id"], size, scene["box"])
        mp3 = audio_dir / f"{scene['id']}.mp3"
        words = await speak(scene["line"], mp3, audio_dir / f"{scene['id']}.json")
        wav = audio_dir / f"{scene['id']}.wav"
        parts = sorted(audio_dir.glob(f"{scene['id']}-*.wav"))
        if parts and not (wav.exists() and wav.stat().st_size > 1000):
            lst = audio_dir / f"{scene['id']}-list.txt"
            lst.write_text("".join(f"file '{part}'\n" for part in parts), encoding="utf-8")
            subprocess.check_call(
                ["ffmpeg", "-y", "-f", "concat", "-safe", "0", "-i", str(lst), "-c", "copy", str(wav)],
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
            )
        elif not wav.exists():
            to_wav(mp3, wav)
        scene["speech"] = ffprobe_duration(wav)
        scene["words"] = words
        print("tts", scene["id"], round(scene["speech"], 2), "words", len(words))

    silence = audio_dir / "pad.wav"
    subprocess.check_call(
        ["ffmpeg", "-y", "-f", "lavfi", "-t", "0.4", "-i", "anullsrc=r=24000:cl=mono", "-c:a", "pcm_s16le", str(silence)],
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )
    concat = audio_dir / "concat.txt"
    lines = []
    cursor = 0.0
    caption_rows = []
    for scene in SCENES:
        scene["start"] = cursor
        scene["dur"] = scene["speech"] + 0.4
        lines.append(f"file '{audio_dir / (scene['id'] + '.wav')}'")
        lines.append(f"file '{silence}'")
        groups = caption_lines(scene["words"])
        for i, group in enumerate(groups):
            start = cursor + group[0]["start"]
            if i + 1 < len(groups):
                end = cursor + groups[i + 1][0]["start"]
            else:
                end = cursor + scene["speech"]
            if end <= start + 0.2:
                end = start + 0.45
            caption_rows.append({"start": start, "end": end, "html": rich_line(group)})
        cursor += scene["dur"]
    concat.write_text("\n".join(lines) + "\n", encoding="utf-8")
    narration = ROOT / "assets/narration.wav"
    subprocess.check_call(
        ["ffmpeg", "-y", "-f", "concat", "-safe", "0", "-i", str(concat), "-c", "copy", str(narration)],
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )
    total = ffprobe_duration(narration)
    comp = ROOT / "compositions"
    for scene in SCENES:
        (comp / f"{scene['id']}.html").write_text(board_html(scene, hand), encoding="utf-8")
    (comp / "captions.html").write_text(captions_html(caption_rows, total), encoding="utf-8")
    (ROOT / "index.html").write_text(index_html(SCENES, total), encoding="utf-8")
    meta = {
        "total": total,
        "hand": {"w": hand[0], "h": hand[1], "tip": hand[2]},
        "scenes": [
            {
                "id": s["id"],
                "start": s["start"],
                "dur": s["dur"],
                "box": s["box"],
                "trace": [0.7, 1.35],
            }
            for s in SCENES
        ],
    }
    (ROOT / "assets/timeline.json").write_text(json.dumps(meta, indent=2), encoding="utf-8")
    print("total", round(total, 2))


if __name__ == "__main__":
    asyncio.run(main())
