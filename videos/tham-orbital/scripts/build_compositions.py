"""Write the orbital compositions from assets/timeline.json."""

from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
TIMELINE = json.loads((ROOT / "assets" / "timeline.json").read_text(encoding="utf-8"))
DURATION = TIMELINE["duration"]

FONTS = """
    @font-face { font-family: Text; font-style: normal; font-weight: 600; font-display: block; src: url("assets/fonts/bevn-600-00.woff2") format("woff2"); unicode-range: U+0102-0103, U+0110-0111, U+0128-0129, U+0168-0169, U+01A0-01A1, U+01AF-01B0, U+0300-0301, U+0303-0304, U+0308-0309, U+0323, U+0329, U+1EA0-1EF9, U+20AB; }
    @font-face { font-family: Text; font-style: normal; font-weight: 600; font-display: block; src: url("assets/fonts/bevn-600-01.woff2") format("woff2"); unicode-range: U+0100-02BA, U+02BD-02C5, U+02C7-02CC, U+02CE-02D7, U+02DD-02FF, U+0304, U+0308, U+0329, U+1D00-1DBF, U+1E00-1E9F, U+1EF2-1EFF, U+2020, U+20A0-20AB, U+20AD-20C4, U+2113, U+2C60-2C7F, U+A720-A7FF; }
    @font-face { font-family: Text; font-style: normal; font-weight: 600; font-display: block; src: url("assets/fonts/bevn-600-02.woff2") format("woff2"); unicode-range: U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD; }
    @font-face { font-family: Text; font-style: normal; font-weight: 700; font-display: block; src: url("assets/fonts/bevn-700-03.woff2") format("woff2"); unicode-range: U+0102-0103, U+0110-0111, U+0128-0129, U+0168-0169, U+01A0-01A1, U+01AF-01B0, U+0300-0301, U+0303-0304, U+0308-0309, U+0323, U+0329, U+1EA0-1EF9, U+20AB; }
    @font-face { font-family: Text; font-style: normal; font-weight: 700; font-display: block; src: url("assets/fonts/bevn-700-04.woff2") format("woff2"); unicode-range: U+0100-02BA, U+02BD-02C5, U+02C7-02CC, U+02CE-02D7, U+02DD-02FF, U+0304, U+0308, U+0329, U+1D00-1DBF, U+1E00-1E9F, U+1EF2-1EFF, U+2020, U+20A0-20AB, U+20AD-20C4, U+2113, U+2C60-2C7F, U+A720-A7FF; }
    @font-face { font-family: Text; font-style: normal; font-weight: 700; font-display: block; src: url("assets/fonts/bevn-700-05.woff2") format("woff2"); unicode-range: U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD; }
"""

STARS = [
    (90, 260, 1.5, 0.35),
    (180, 420, 1.2, 0.5),
    (260, 310, 2, 0.28),
    (340, 520, 1.4, 0.42),
    (430, 240, 1.2, 0.55),
    (510, 360, 1.8, 0.3),
    (620, 280, 1.3, 0.48),
    (710, 450, 1.6, 0.33),
    (800, 320, 1.2, 0.6),
    (900, 240, 2, 0.25),
    (980, 400, 1.4, 0.4),
    (140, 700, 1.2, 0.3),
    (960, 760, 1.5, 0.45),
    (120, 980, 1.8, 0.28),
    (1000, 1040, 1.3, 0.38),
    (70, 1120, 1.2, 0.5),
    (200, 150, 1.4, 0.32),
    (860, 160, 1.6, 0.4),
    (470, 1080, 1.2, 0.22),
    (640, 1120, 1.5, 0.3),
]


def stars() -> str:
    circles = "\n".join(
        f'      <circle cx="{x}" cy="{y}" r="{r}" fill="#d7e4ea" opacity="{o}"/>'
        for x, y, r, o in STARS
    )
    return f"""    <svg class="stars" data-layout-ignore="true" viewBox="0 0 1080 1920" width="1080" height="1920">
{circles}
    </svg>"""


def chrome(count: str) -> str:
    return f"""    <div class="mark">SPATIAL FLOW</div>
    <div class="pill"><span class="dot"></span>tram ai</div>
    <div class="count">{count}</div>
    <div class="glow" data-layout-ignore="true"></div>
{stars()}"""


BASE = f"""
    #root {{
      position: absolute;
      inset: 0;
      overflow: hidden;
      background: #071018;
      font-family: Text, sans-serif;
      color: #f5f8fb;
    }}
    .stars {{ position: absolute; inset: 0; pointer-events: none; }}
    .glow {{
      position: absolute;
      left: 120px;
      top: 260px;
      width: 840px;
      height: 840px;
      background: radial-gradient(circle, rgba(62,231,245,0.12) 0%, rgba(62,231,245,0) 68%);
      pointer-events: none;
    }}
    .mark, .count {{
      position: absolute;
      top: 188px;
      font-weight: 600;
      font-size: 28px;
      letter-spacing: 3px;
      color: #8b97a8;
      text-transform: uppercase;
    }}
    .mark {{ left: 72px; }}
    .count {{ right: 72px; }}
    .pill {{
      position: absolute;
      top: 176px;
      left: 0;
      right: 0;
      display: flex;
      justify-content: center;
      align-items: center;
      gap: 10px;
      font-weight: 600;
      font-size: 28px;
      color: #f5f8fb;
    }}
    .pill .dot {{
      width: 28px;
      height: 28px;
      border-radius: 999px;
      background: #3ee7f5;
    }}
    .node {{
      position: absolute;
      width: 84px;
      height: 84px;
    }}
    .disc {{
      width: 84px;
      height: 84px;
      border-radius: 999px;
      border: 2px solid #1a6f7a;
      background: transparent;
      display: flex;
      align-items: center;
      justify-content: center;
    }}
    .num {{
      font-weight: 700;
      font-size: 28px;
      color: #8b97a8;
    }}
    .label {{
      position: absolute;
      font-weight: 600;
      font-size: 32px;
      color: #8b97a8;
      white-space: nowrap;
    }}
"""


def wrap(comp_id: str, body: str, script: str, extra_css: str = "") -> str:
    return f"""<template>
  <style>
{FONTS}
{BASE}
{extra_css}
  </style>
  <div id="root" data-composition-id="{comp_id}" data-width="1080" data-height="1920" data-layout-allow-overlap>
{body}
  </div>
  <script>
    const tl = gsap.timeline({{ paused: true }});
{script}
    window.__timelines["{comp_id}"] = tl;
  </script>
</template>
"""


def cue_local(scene: str) -> list[dict]:
    start = next(item["start"] for item in TIMELINE["scenes"] if item["id"] == scene)
    rows = []
    for cue in TIMELINE["cues"]:
        if cue["scene"] != scene:
            continue
        rows.append({**cue, "local": round(cue["start"] - start, 3)})
    return rows


ARC = 524


def ring_svg(arrows_offset: int, extra: str = "") -> str:
    hidden = f'stroke-dasharray="{ARC}" stroke-dashoffset="{arrows_offset}"'
    return f"""    <svg class="rings" data-layout-ignore="true" viewBox="0 0 1080 1920" width="1080" height="1920">
      <circle cx="540" cy="680" r="340" fill="none" stroke="#1a6f7a" stroke-width="1" stroke-dasharray="6 10"/>
      <circle class="loop" cx="540" cy="680" r="250" fill="none" stroke="#1a6f7a" stroke-width="2"/>
      <path id="arc12" d="M 540 430 A 250 250 0 0 1 756.5 805" fill="none" stroke="#3ee7f5" stroke-width="4" stroke-linecap="round" {hidden}/>
      <path id="arc23" d="M 756.5 805 A 250 250 0 0 1 323.5 805" fill="none" stroke="#3ee7f5" stroke-width="4" stroke-linecap="round" {hidden}/>
      <path id="arc31" d="M 323.5 805 A 250 250 0 0 1 540 430" fill="none" stroke="#3ee7f5" stroke-width="4" stroke-linecap="round" {hidden}/>
      {extra}
    </svg>"""


def node_html(prefix, nid, left, top, num, label, lx, ly, width, align, filled, shown, new_label=None):
    disc = ' style="background:#3ee7f5;border-color:#3ee7f5"' if filled else ""
    num_style = ' style="color:#071018"' if filled else ""
    label_color = "#f5f8fb" if filled else "#8b97a8"
    opacity = "" if shown else "opacity:0;"
    new = ""
    if new_label:
        new = f'\n    <div id="{prefix}-{nid}-next" class="label" style="left:{lx}px;top:{ly}px;width:{width}px;text-align:{align};opacity:0">{new_label}</div>'
    return f"""    <div id="{prefix}-{nid}" class="node" style="left:{left}px;top:{top}px;{opacity}">
      <div class="disc"{disc}><div class="num"{num_style}>{num}</div></div>
    </div>
    <div id="{prefix}-{nid}-label" class="label" style="left:{lx}px;top:{ly}px;width:{width}px;text-align:{align};color:{label_color}{';opacity:0' if not shown else ''}">{label}</div>{new}"""


SLOTS = [
    ("n1", 498, 388, "01", 420, 328, 240, "center"),
    ("n2", 714, 763, "02", 820, 784, 220, "left"),
    ("n3", 282, 763, "03", 48, 784, 210, "right"),
]


def three_nodes(prefix, labels, filled, shown, nxt=None):
    parts = []
    for index, slot in enumerate(SLOTS):
        nid, left, top, num, lx, ly, width, align = slot
        parts.append(node_html(prefix, nid, left, top, num, labels[index], lx, ly, width, align, filled, shown, nxt[index] if nxt else None))
    return "\n".join(parts)


def light(prefix: str, nid: str, at) -> str:
    return f"""
    tl.to("#{prefix}-{nid}", {{ opacity: 1, duration: 0.2 }}, {at});
    tl.to("#{prefix}-{nid} .disc", {{ backgroundColor: "#3ee7f5", borderColor: "#3ee7f5", duration: 0.22 }}, {at});
    tl.to("#{prefix}-{nid} .num", {{ color: "#071018", duration: 0.22 }}, {at});
    tl.to("#{prefix}-{nid}-label", {{ opacity: 1, color: "#f5f8fb", duration: 0.22 }}, {at});"""


def build_orbit() -> str:
    css = """
    .kicker { position: absolute; left: 120px; right: 120px; top: 560px; text-align: center; font-size: 28px; font-weight: 600; letter-spacing: 1px; color: #3ee7f5; }
    .hero { position: absolute; left: 72px; right: 72px; top: 610px; text-align: center; font-size: 112px; font-weight: 700; line-height: 0.9; }
    .loop { stroke: #3ee7f5; stroke-width: 3px; }
    """
    body = f"""{chrome("01 ĐIỂM")}
{ring_svg(ARC)}
    <div class="kicker">KHÔNG PHẢI VẾT BẨN</div>
    <div class="hero">VÒNG</div>
"""
    script = """
    tl.fromTo(".hero", { opacity: 1 }, { opacity: 1, duration: 0.2, immediateRender: false }, 0);
"""
    return wrap("orbit", body, script, css)


def build_loop() -> str:
    cues = cue_local("loop")
    body = f"""{chrome("03 ĐIỂM")}
{ring_svg(ARC)}
    <div class="kicker" style="position:absolute;left:0;right:0;top:248px;text-align:center;font-size:28px;font-weight:600;letter-spacing:2px;color:#3ee7f5">PHỤ NỮ TRẺ</div>
{three_nodes("loop", ["Cọ", "Viêm", "Đậm"], filled=False, shown=False)}
    <div id="loop-elbow" class="label" style="left:0;right:0;top:980px;text-align:center;width:1080px;opacity:0">chống bàn</div>
"""
    at = [cue["local"] for cue in cues]
    script = f"""
{light("loop", "n1", at[0])}
    tl.to("#arc12", {{ strokeDashoffset: 0, duration: 0.45, ease: "none" }}, {at[1]});
{light("loop", "n2", at[1])}
    tl.to("#arc23", {{ strokeDashoffset: 0, duration: 0.45, ease: "none" }}, {at[2]});
{light("loop", "n3", at[2])}
    tl.to("#arc31", {{ strokeDashoffset: 0, duration: 0.45, ease: "none" }}, {at[3]});
    tl.to("#loop-elbow", {{ opacity: 1, color: "#f5f8fb", duration: 0.25 }}, {at[3]});
"""
    return wrap("loop", body, script)


def build_contrast() -> str:
    cues = cue_local("contrast")
    extra = '<line id="exit" x1="700" y1="520" x2="700" y2="520" stroke="#3ee7f5" stroke-width="5" stroke-linecap="round"/>'
    body = f"""{chrome("02 ĐIỂM")}
{ring_svg(0, extra)}
{three_nodes("contrast", ["Cọ", "Viêm", "Đậm"], filled=True, shown=True)}
    <div id="exit-label" class="label" style="left:800px;top:300px;width:180px;opacity:0">Chanh</div>
"""
    a, b = cues[0]["local"], cues[1]["local"]
    script = f"""
    tl.to("#exit", {{ attr: {{ x2: 940, y2: 360 }}, duration: 0.45, ease: "power2.out" }}, {a});
    tl.to("#exit-label", {{ opacity: 1, color: "#f5f8fb", duration: 0.25 }}, {a});
    tl.to("#exit", {{ attr: {{ x2: 756, y2: 805 }}, duration: 0.45, ease: "power2.in" }}, {b});
    tl.to("#exit-label", {{ opacity: 0, duration: 0.2 }}, {b});
    tl.to("#contrast-n2 .disc", {{ scale: 1.08, duration: 0.2, yoyo: true, repeat: 1 }}, {b});
"""
    return wrap("contrast", body, script)


def build_undo() -> str:
    cues = cue_local("undo")
    body = f"""{chrome("03 ĐIỂM")}
{ring_svg(0)}
{three_nodes("undo", ["Cọ", "Viêm", "Đậm"], filled=True, shown=True, nxt=["Áo thoáng", "Rửa dịu", "Dưỡng"])}
"""
    lines = []
    for index, cue in enumerate(cues):
        nid = f"n{index + 1}"
        at = cue["local"]
        lines.append(f'    tl.to("#undo-{nid}-label", {{ opacity: 0, duration: 0.2 }}, {at});')
        lines.append(f'    tl.to("#undo-{nid}-next", {{ opacity: 1, color: "#f5f8fb", duration: 0.25 }}, {at});')
    return wrap("undo", body, "\n".join(lines) + "\n")


def build_close() -> str:
    cues = cue_local("close")
    body = f"""{chrome("01 ĐIỂM")}
{ring_svg(0)}
{three_nodes("close", ["Áo thoáng", "Rửa dịu", "Dưỡng"], filled=True, shown=True)}
    <div id="close-hold" class="kicker" style="position:absolute;left:0;right:0;top:248px;text-align:center;font-size:28px;font-weight:600;letter-spacing:2px;color:#3ee7f5;opacity:0">DỪNG</div>
    <div id="close-out" class="label" style="left:0;right:0;top:1000px;width:1080px;text-align:center;opacity:0">dày như nhung</div>
"""
    a, b = cues[0]["local"], cues[1]["local"]
    script = f"""
    tl.to("#close-hold", {{ opacity: 1, duration: 0.25 }}, {a});
    tl.to("#close-out", {{ opacity: 1, color: "#3ee7f5", duration: 0.25 }}, {b});
"""
    return wrap("close", body, script)

def caption_html(text: str, hot: str) -> str:
    if hot not in text:
        raise SystemExit(f"hot word {hot!r} missing from {text!r}")
    return text.replace(hot, f'<span class="hot">{hot}</span>', 1)


def build_captions() -> str:
    cues = TIMELINE["cues"]
    blocks = []
    script_rows = []
    for index, cue in enumerate(cues):
        if index + 1 < len(cues):
            end = round(cues[index + 1]["start"] - 0.04, 3)
        else:
            end = round(DURATION - 0.08, 3)
        start = cue["start"]
        dur = round(end - start, 3)
        cid = f"c{cue['id']}"
        blocks.append(
            f"""    <div id="{cid}" class="clip cap" data-start="{start}" data-duration="{dur}" data-track-index="0">
      <div class="line">{caption_html(cue["text"], cue["hot"])}</div>
    </div>"""
        )
        script_rows.append(f'["{cid}", {start}, {end}]')
    rows = ",\n    ".join(script_rows)
    return f"""<template>
  <style>
{FONTS}
    #root {{ position: absolute; inset: 0; overflow: visible; pointer-events: none; }}
    .cap {{ position: absolute; left: 72px; right: 72px; top: 1220px; text-align: center; }}
    .line {{
      display: inline-block;
      opacity: 0;
      visibility: hidden;
      font-family: Text, sans-serif;
      font-weight: 600;
      font-size: 40px;
      line-height: 1.25;
      color: #8b97a8;
    }}
    .hot {{ color: #3ee7f5; }}
  </style>
  <div id="root" data-composition-id="captions" data-width="1080" data-height="1920" data-layout-allow-overlap data-layout-allow-caption-zone>
{chr(10).join(blocks)}
  </div>
  <script>
    const groups = [
    {rows}
    ];
    const tl = gsap.timeline({{ paused: true }});
    for (const [id, start, end] of groups) {{
      const line = "#" + id + " .line";
      tl.set(line, {{ visibility: "visible" }}, start);
      tl.fromTo(line, {{ opacity: 0, y: 14 }}, {{ opacity: 1, y: 0, duration: 0.16, ease: "power3.out", immediateRender: false }}, start);
      tl.to(line, {{ opacity: 0, duration: 0.1, ease: "power2.in" }}, end - 0.12);
      tl.set(line, {{ opacity: 0, visibility: "hidden" }}, end - 0.02);
    }}
    window.__timelines["captions"] = tl;
  </script>
</template>
"""


def build_progress() -> str:
    return f"""<template>
  <style>
    #root {{ position: absolute; inset: 0; overflow: hidden; background: transparent; pointer-events: none; }}
    #progress-track, #progress-fill {{
      position: absolute;
      left: 72px;
      top: 1310px;
      width: 936px;
      height: 3px;
    }}
    #progress-track {{ background: rgba(255,255,255,0.16); }}
    #progress-fill {{ background: #3ee7f5; transform-origin: left center; }}
  </style>
  <div id="root" data-composition-id="progress" data-width="1080" data-height="1920">
    <div id="progress-track"></div>
    <div id="progress-fill"></div>
  </div>
  <script>
    const tl = gsap.timeline({{ paused: true }});
    tl.fromTo("#progress-fill", {{ scaleX: 0 }}, {{ scaleX: 1, duration: {round(DURATION - 0.05, 3)}, ease: "none" }}, 0);
    window.__timelines["progress"] = tl;
  </script>
</template>
"""


def build_index() -> str:
    scenes = TIMELINE["scenes"]
    hosts = []
    for scene in scenes:
        hosts.append(
            f"""      <div
        id="{scene['id']}"
        data-composition-id="{scene['id']}"
        data-composition-src="compositions/{scene['id']}.html"
        data-start="{scene['start']}"
        data-duration="{scene['duration']}"
        data-track-index="1"
        data-track-kind="graphics"
        data-width="1080"
        data-height="1920"
        style="z-index: 1"
      ></div>"""
        )
    return f"""<!doctype html>
<html lang="vi" data-resolution="portrait">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=1080, height=1920" />
    <script src="https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js"></script>
    <style>
      * {{ margin: 0; padding: 0; box-sizing: border-box; }}
      html, body {{ margin: 0; width: 1080px; height: 1920px; overflow: hidden; background: #071018; }}
    </style>
  </head>
  <body>
    <div id="root" data-composition-id="main" data-start="0" data-duration="{DURATION}" data-width="1080" data-height="1920">
{chr(10).join(hosts)}
      <div
        id="captions"
        data-composition-id="captions"
        data-composition-src="compositions/captions.html"
        data-start="0"
        data-duration="{DURATION}"
        data-track-index="3"
        data-track-kind="captions"
        data-width="1080"
        data-height="1920"
        style="z-index: 4"
      ></div>
      <div
        id="progress"
        data-composition-id="progress"
        data-composition-src="compositions/progress.html"
        data-start="0"
        data-duration="{DURATION}"
        data-track-index="4"
        data-track-kind="graphics"
        data-width="1080"
        data-height="1920"
        style="z-index: 5"
      ></div>
      <audio id="voiceover" src="assets/narration.wav" data-start="0" data-duration="{DURATION}" data-track-index="2" data-volume="1"></audio>
    </div>
    <script>
      window.__timelines["main"] = gsap.timeline({{ paused: true }});
    </script>
  </body>
</html>
"""


def main() -> None:
    out = ROOT / "compositions"
    out.mkdir(parents=True, exist_ok=True)
    (out / "orbit.html").write_text(build_orbit(), encoding="utf-8")
    (out / "loop.html").write_text(build_loop(), encoding="utf-8")
    (out / "contrast.html").write_text(build_contrast(), encoding="utf-8")
    (out / "undo.html").write_text(build_undo(), encoding="utf-8")
    (out / "close.html").write_text(build_close(), encoding="utf-8")
    for stale in ("ring.html", "stack.html"):
        (out / stale).unlink(missing_ok=True)
    (out / "captions.html").write_text(build_captions(), encoding="utf-8")
    (out / "progress.html").write_text(build_progress(), encoding="utf-8")
    (ROOT / "index.html").write_text(build_index(), encoding="utf-8")
    print("wrote compositions")


if __name__ == "__main__":
    main()
