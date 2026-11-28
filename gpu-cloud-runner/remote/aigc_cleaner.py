#!/usr/bin/env python3
"""Apply the SynthID video watermark cleaner to uploaded videos or job output."""

import argparse
import json
import shutil
import subprocess
import sys
from contextlib import ExitStack
from fractions import Fraction
from pathlib import Path
from tempfile import TemporaryDirectory

MAX_FPS = 30


def read_source_fps(source: Path) -> Fraction:
    probe = subprocess.run(
        [
            "ffprobe", "-v", "error", "-select_streams", "V:0",
            "-show_entries", "stream=avg_frame_rate,r_frame_rate", "-of", "json", str(source),
        ],
        check=True,
        stdout=subprocess.PIPE,
        text=True,
    )
    streams = json.loads(probe.stdout).get("streams", [])
    if streams:
        for field in ("avg_frame_rate", "r_frame_rate"):
            try:
                fps = Fraction(streams[0].get(field, "0"))
            except (ValueError, ZeroDivisionError):
                continue
            if fps > 0:
                return fps
    raise ValueError(f"Không đọc được FPS của video: {source.name}")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output-dir", required=True, type=Path)
    parser.add_argument("--inputs", nargs="+", type=Path)
    parser.add_argument("--profile", choices=("synthid", "wan21-synthid"), default="synthid")
    args = parser.parse_args()

    output_dir = args.output_dir.resolve()
    cleaned_dir = output_dir / "aigc-cleaned"
    sources = args.inputs or sorted(
        path for path in output_dir.rglob("*")
        if path.is_file() and path.suffix.lower() == ".mp4" and cleaned_dir not in path.parents
    )
    if not sources:
        print(f"Không tìm thấy MP4 trong {output_dir}; bỏ qua bước xoá watermark.", flush=True)
        return 0

    if shutil.which("uv"):
        cleaner = shutil.which("remove-ai-watermarks")
        if cleaner is None:
            candidate = Path.home() / ".local" / "bin" / "remove-ai-watermarks"
            if candidate.exists():
                cleaner = str(candidate)
            else:
                subprocess.run(
                    ["uv", "tool", "install", "--python", "3.12", "--torch-backend=auto", "remove-ai-watermarks[video,diffusion]"],
                    check=True,
                )
                cleaner = shutil.which("remove-ai-watermarks") or str(candidate)
                if not Path(cleaner).exists():
                    raise RuntimeError("uv cài xong nhưng không tìm thấy remove-ai-watermarks")
    else:
        python = sys.executable
        subprocess.run([python, "-m", "pip", "install", "remove-ai-watermarks[video,diffusion]"], check=True)
        cleaner = shutil.which("remove-ai-watermarks")
        if cleaner is None:
            cleaner = str(Path(python).parent / "remove-ai-watermarks")
            if not Path(cleaner).exists():
                raise RuntimeError("Không tìm thấy lệnh remove-ai-watermarks sau khi cài package")

    cleaned_dir.mkdir(parents=True, exist_ok=True)
    for source in sources:
        relative = Path(source.name) if args.inputs else source.relative_to(output_dir)
        destination = cleaned_dir / relative
        destination.parent.mkdir(parents=True, exist_ok=True)
        source_fps = read_source_fps(source)
        print(
            f"Đang xử lý {args.profile}: {relative} ({float(source_fps):g} → {float(min(source_fps, MAX_FPS)):g} fps)",
            flush=True,
        )
        with ExitStack() as cleanup:
            cleaner_input = source
            profile_options = []
            if args.profile == "synthid":
                fps_options = ["--keep-fps"] if source_fps <= MAX_FPS else ["--fps", str(MAX_FPS)]
                profile_options = ["--long-side", "1920", *fps_options]
            elif source_fps > MAX_FPS:
                # Wan preserves input FPS and does not accept the 2D profile's --fps.
                temp_dir = cleanup.enter_context(TemporaryDirectory(prefix="wan-fps-", dir=output_dir.parent))
                cleaner_input = Path(temp_dir) / source.name
                subprocess.run(
                    [
                        "ffmpeg", "-nostdin", "-loglevel", "error", "-i", str(source),
                        "-map", "0:V:0", "-map", "0:a?", "-vf", f"fps={MAX_FPS}",
                        "-c:v", "libx264", "-crf", "12", "-c:a", "copy", str(cleaner_input),
                    ],
                    check=True,
                )

            device = ["--device", "cuda"] if args.inputs or args.profile == "wan21-synthid" else []
            subprocess.run(
                [
                    cleaner, "video", "invisible", str(cleaner_input), "--profile", args.profile,
                    *profile_options, *device, "-o", str(destination),
                ],
                check=True,
            )
        print(f"Đã lưu: {destination.relative_to(output_dir)}", flush=True)
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except subprocess.CalledProcessError as error:
        print(f"Lệnh xoá watermark thất bại (exit {error.returncode}).", file=sys.stderr)
        raise SystemExit(error.returncode or 1)
    except Exception as error:
        print(f"Lỗi bước xoá watermark AIGC: {error}", file=sys.stderr)
        raise SystemExit(1)
