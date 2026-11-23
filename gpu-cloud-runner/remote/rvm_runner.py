#!/usr/bin/env python3
"""Run official Robust Video Matting MobileNetV3 on one or more videos."""

import argparse
from fractions import Fraction
from pathlib import Path
import sys


def parse_args():
    parser = argparse.ArgumentParser(description="Robust Video Matting batch runner")
    parser.add_argument("--inputs", nargs="+", required=True)
    parser.add_argument("--output-dir", required=True)
    parser.add_argument("--video-mbps", type=float, default=4)
    return parser.parse_args()


def main():
    args = parse_args()

    try:
        import av
        import numpy as np
        import torch
    except ImportError:
        sys.exit(
            "PyTorch chưa có trên cloud. Hãy dùng GPU image có sẵn PyTorch/CUDA "
            "hoặc cài torch phù hợp với CUDA trước."
        )

    if not torch.cuda.is_available():
        sys.exit("Không thấy CUDA GPU trong PyTorch (torch.cuda.is_available() = False).")

    output_dir = Path(args.output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)
    device = "cuda"

    print(f"GPU: {torch.cuda.get_device_name(0)}", flush=True)
    print("Loading official RVM MobileNetV3 weights...", flush=True)
    model = torch.hub.load(
        "PeterL1n/RobustVideoMatting",
        "mobilenetv3",
        pretrained=True,
        trust_repo=True,
    ).eval().to(device)

    for input_value in args.inputs:
        input_path = Path(input_value)
        stem = input_path.stem
        print(f"Processing: {input_path.name}", flush=True)
        input_container = av.open(str(input_path))
        input_stream = input_container.streams.video[0]
        frame_rate = input_stream.average_rate or Fraction(30, 1)
        sinks = {
            "green": VideoSink(output_dir / f"{stem}_green.mp4", frame_rate, args.video_mbps),
            "alpha": VideoSink(output_dir / f"{stem}_alpha.mp4", frame_rate, args.video_mbps),
            "foreground": VideoSink(output_dir / f"{stem}_foreground.mp4", frame_rate, args.video_mbps),
        }
        recurrent = [None] * 4
        downsample_ratio = None
        frame_count = 0

        try:
            with torch.inference_mode():
                for frame in input_container.decode(video=0):
                    rgb = frame.to_ndarray(format="rgb24")
                    height, width = rgb.shape[:2]
                    if downsample_ratio is None:
                        downsample_ratio = min(512 / max(height, width), 1)
                    source = (
                        torch.from_numpy(np.ascontiguousarray(rgb))
                        .permute(2, 0, 1)
                        .unsqueeze(0)
                        .to(device=device, dtype=torch.float32)
                        .div_(255)
                    )
                    foreground, alpha, *recurrent = model(
                        source, *recurrent, downsample_ratio
                    )
                    green = torch.tensor(
                        [120 / 255, 1, 155 / 255], device=device
                    ).view(1, 3, 1, 1)
                    composition = foreground * alpha + green * (1 - alpha)
                    alpha_rgb = alpha.repeat(1, 3, 1, 1)
                    sinks["green"].write(tensor_to_rgb(composition))
                    sinks["alpha"].write(tensor_to_rgb(alpha_rgb))
                    sinks["foreground"].write(tensor_to_rgb(foreground))
                    frame_count += 1
                    if frame_count % 30 == 0:
                        print(f"Processed {frame_count} frames", flush=True)
        finally:
            input_container.close()
            for sink in sinks.values():
                sink.close()

        print(f"Finished {frame_count} frames", flush=True)

    print(f"Done. Outputs: {output_dir}", flush=True)


def tensor_to_rgb(tensor):
    return (
        tensor[0]
        .clamp(0, 1)
        .mul(255)
        .byte()
        .cpu()
        .permute(1, 2, 0)
        .numpy()
    )


class VideoSink:
    def __init__(self, output_path, frame_rate, video_mbps):
        import av

        self.av = av
        self.container = av.open(str(output_path), mode="w")
        self.stream = self.container.add_stream("h264", rate=frame_rate)
        self.stream.pix_fmt = "yuv420p"
        self.stream.bit_rate = int(video_mbps * 1_000_000)
        self.configured = False

    def write(self, rgb):
        if not self.configured:
            self.stream.width = rgb.shape[1]
            self.stream.height = rgb.shape[0]
            self.configured = True
        frame = self.av.VideoFrame.from_ndarray(rgb, format="rgb24")
        for packet in self.stream.encode(frame):
            self.container.mux(packet)

    def close(self):
        if self.configured:
            for packet in self.stream.encode():
                self.container.mux(packet)
        self.container.close()


if __name__ == "__main__":
    main()
