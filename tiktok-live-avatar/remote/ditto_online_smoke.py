#!/usr/bin/env python3
"""Validate Ditto's online pipeline with a finite WAV file.

This intentionally mirrors the chunking used by Ditto's official inference
script, but imports StreamSDK from stream_pipeline_online and forces
online_mode=True for the PyTorch checkpoint.
"""

from __future__ import annotations

import argparse
import math
import subprocess
import sys
from pathlib import Path

import librosa
import numpy as np


class RealtimeFlvWriter:
    """Write RGB frames to a real-time-throttled FLV stream."""

    def __init__(
        self,
        output: Path,
        audio: Path,
        width: int,
        height: int,
        fps: int = 25,
        codec: str = "libx264",
    ) -> None:
        output.parent.mkdir(parents=True, exist_ok=True)
        if codec == "h264_nvenc":
            video_codec_args = [
                "-c:v",
                codec,
                "-preset",
                "p4",
                "-tune",
                "ll",
                "-rc",
                "cbr",
            ]
        else:
            video_codec_args = [
                "-c:v",
                "libx264",
                "-preset",
                "veryfast",
                "-tune",
                "zerolatency",
            ]
        self.process = subprocess.Popen(
            [
                "ffmpeg",
                "-hide_banner",
                "-loglevel",
                "warning",
                "-y",
                "-re",
                "-f",
                "rawvideo",
                "-pixel_format",
                "rgb24",
                "-video_size",
                f"{width}x{height}",
                "-framerate",
                str(fps),
                "-i",
                "pipe:0",
                "-i",
                str(audio),
                "-map",
                "0:v:0",
                "-map",
                "1:a:0",
                "-vf",
                "scale=720:-2,pad=720:1280:(ow-iw)/2:(oh-ih)/2:black",
                *video_codec_args,
                "-b:v",
                "4000k",
                "-maxrate",
                "4000k",
                "-bufsize",
                "8000k",
                "-g",
                str(fps * 2),
                "-pix_fmt",
                "yuv420p",
                "-c:a",
                "aac",
                "-b:a",
                "128k",
                "-ar",
                "48000",
                "-f",
                "flv",
                str(output),
            ],
            stdin=subprocess.PIPE,
        )

    def __call__(self, frame: np.ndarray, fmt: str = "rgb") -> None:
        if self.process.stdin is None:
            raise RuntimeError("FFmpeg stdin is closed")
        if fmt == "bgr":
            frame = frame[..., ::-1]
        self.process.stdin.write(np.ascontiguousarray(frame).tobytes())

    def close(self) -> None:
        if self.process.stdin is not None:
            self.process.stdin.close()
        return_code = self.process.wait()
        if return_code:
            raise RuntimeError(f"FFmpeg NVENC exited with code {return_code}")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--ditto-root", type=Path, required=True)
    parser.add_argument("--data-root", type=Path, required=True)
    parser.add_argument("--cfg-pkl", type=Path, required=True)
    parser.add_argument("--audio", type=Path, required=True)
    parser.add_argument("--source", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--sampling-timesteps", type=int, default=50)
    parser.add_argument("--max-size", type=int, default=1920)
    parser.add_argument("--flv-output", type=Path)
    parser.add_argument(
        "--flv-codec",
        choices=("libx264", "h264_nvenc"),
        default="libx264",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    sys.path.insert(0, str(args.ditto_root.resolve()))

    from stream_pipeline_online import StreamSDK

    args.output.parent.mkdir(parents=True, exist_ok=True)
    sdk = StreamSDK(str(args.cfg_pkl), str(args.data_root))
    sdk.setup(
        str(args.source),
        str(args.output),
        online_mode=True,
        sampling_timesteps=args.sampling_timesteps,
        max_size=args.max_size,
    )

    if args.flv_output:
        # Replace Ditto's default libx264/imageio writer before any frame arrives.
        sdk.writer.close()
        height, width = sdk.source_info["img_rgb_lst"][0].shape[:2]
        sdk.writer = RealtimeFlvWriter(
            output=args.flv_output,
            audio=args.audio,
            width=width,
            height=height,
            codec=args.flv_codec,
        )

    audio, _ = librosa.load(args.audio, sr=16_000, mono=True)
    audio = np.asarray(audio, dtype=np.float32)

    chunksize = (3, 5, 2)
    sample_stride = chunksize[1] * 640
    window_samples = int(sum(chunksize) * 0.04 * 16_000) + 80

    # The first motion window warms up without emitting frames. Put silence in
    # that window so the first emitted frame lines up with the real audio.
    warmup_frames = sdk.audio2motion.valid_clip_len
    warmup_silence = max(0, (warmup_frames - chunksize[0]) * 640)
    audio = np.concatenate(
        [
            np.zeros(chunksize[0] * 640, dtype=np.float32),
            np.zeros(warmup_silence, dtype=np.float32),
            audio,
        ]
    )

    expected_frames = math.ceil(len(audio) / 16_000 * 25) - warmup_frames
    print(
        f"audio_samples={len(audio)} warmup_frames={warmup_frames} "
        f"expected_frames~={expected_frames}"
    )

    for offset in range(0, len(audio), sample_stride):
        chunk = audio[offset : offset + window_samples]
        if len(chunk) < window_samples:
            chunk = np.pad(chunk, (0, window_samples - len(chunk)))
        sdk.run_chunk(chunk, chunksize=chunksize)

    sdk.close()

    if args.flv_output:
        print(args.flv_output)
    else:
        subprocess.run(
            [
                "ffmpeg",
                "-loglevel",
                "error",
                "-y",
                "-i",
                sdk.tmp_output_path,
                "-i",
                str(args.audio),
                "-map",
                "0:v:0",
                "-map",
                "1:a:0",
                "-c:v",
                "copy",
                "-c:a",
                "aac",
                "-shortest",
                str(args.output),
            ],
            check=True,
        )
        print(args.output)


if __name__ == "__main__":
    main()
