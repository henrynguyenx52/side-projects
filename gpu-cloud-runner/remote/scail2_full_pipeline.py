#!/usr/bin/env python3
"""Run the full-quality SCAIL2 workflow with its original FP16 and 1080p output."""

import argparse
import json
from pathlib import Path
import shutil

import scail2_installer as installer
import scail2_pipeline as common


FP16_MODEL = "wan2.1_14B_SCAIL_2_fp16.safetensors"


def ensure_full_installation(comfyui, workflow, output_dir, timings):
    models = dict(installer.MODEL_SPECS)
    directory, url = models.pop(common.LOW_MEMORY_MODEL)
    models[FP16_MODEL] = (directory, url.replace(common.LOW_MEMORY_MODEL, FP16_MODEL))
    # The shared validator resolves FP16 to FP8 for the low-memory installer.
    installer.workflow_models(workflow)

    return installer.install_models(comfyui, models, output_dir, timings)


def patch_full_workflow(source, destination, image_name, video_name, output_prefix, attention):
    workflow = json.loads(source.read_text(encoding="utf-8"))
    image = common.find_node(workflow, 42, "LoadImage")
    video = common.find_node(workflow, 41, "VHS_LoadVideo")
    output = common.find_node(workflow, 44, "VHS_VideoCombine")
    model = common.find_node(workflow, 16, "DiffusionModelLoaderKJ")
    if model["widgets_values"][0] != FP16_MODEL:
        raise ValueError("Preset máy khỏe cần workflow FP16")
    resize = common.find_node(workflow, 49, "ImageResizeKJv2")
    output_link = next(
        item["link"] for item in output["inputs"] if item["name"] == "images"
    )
    if resize["widgets_values"][:2] != [1080, 1920] or not any(
        link[:5] == [output_link, 49, 0, 44, 0] for link in workflow["links"]
    ):
        raise ValueError("Preset máy khỏe cần nối resize 1080×1920 vào VideoCombine")
    image["widgets_values"][0] = image_name
    video["widgets_values"].update(video=video_name, force_rate=30.0)
    common.disconnect_input(workflow, video, "force_rate")
    output["widgets_values"]["filename_prefix"] = output_prefix
    model["widgets_values"][4] = attention
    destination.write_text(json.dumps(workflow, ensure_ascii=False), encoding="utf-8")


def parse_args():
    parser = argparse.ArgumentParser(description="SCAIL2 Fast 15s FP16")
    parser.add_argument("--comfyui", required=True)
    parser.add_argument("--workflow", required=True)
    parser.add_argument("--output-dir", required=True)
    parser.add_argument("--install-only", action="store_true")
    parser.add_argument("--image")
    parser.add_argument("--video")
    parser.add_argument("--port", type=int, default=8189)
    args = parser.parse_args()
    if not args.install_only and not (args.image and args.video):
        parser.error("Chạy render cần --image và --video")
    return args


def main():
    args = parse_args()
    comfyui = Path(args.comfyui).expanduser().resolve()
    workflow = Path(args.workflow).resolve()
    output_dir = Path(args.output_dir).resolve()
    output_dir.mkdir(parents=True, exist_ok=True)
    timings = {}
    if args.install_only:
        models = ensure_full_installation(comfyui, workflow, output_dir, timings)
        report = {"workflow": workflow.name, "comfyui": str(comfyui), "models": models, "timings_seconds": timings}
        (output_dir / "install-report.json").write_text(
            json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8",
        )
        print(f"Hoàn tất cài SCAIL2 Fast FP16: {len(models)} model", flush=True)
        return

    image = Path(args.image).resolve()
    video = Path(args.video).resolve()
    job_dir = workflow.parent
    input_dir = comfyui / "input"
    prefix = f"gpu-cloud-runner-{job_dir.name}"
    image_target = input_dir / f"{prefix}-reference{image.suffix.lower() or '.png'}"
    video_target = input_dir / f"{prefix}-driving-30fps.mp4"
    relative_output = Path("gpu-cloud-runner") / job_dir.name
    patched = job_dir / "scail2-full-run.json"
    log_path = output_dir / "comfyui.log"
    process = log_file = None
    if not image.is_file() or not video.is_file() or not workflow.is_file():
        raise ValueError("Thiếu ảnh, video hoặc workflow trên remote")
    try:
        patch_full_workflow(
            workflow, patched, image_target.name, video_target.name,
            (relative_output / "SCAIL2_V46_FULL_15S").as_posix(),
            common.detect_sage_attention_mode(),
        )
        with installer.record_stage(timings, "setup"):
            ensure_full_installation(comfyui, workflow, output_dir, timings)
        with installer.record_stage(timings, "prepare_inputs"):
            input_dir.mkdir(parents=True, exist_ok=True)
            shutil.copy2(image, image_target)
            common.normalize_video(video, video_target)
        port = common.reserve_port(args.port)
        with installer.record_stage(timings, "comfyui_start"):
            process, log_file = common.start_comfyui(comfyui, port, log_path)
        with installer.record_stage(timings, "render"):
            common.run_workflow(patched, port)
        videos = common.find_outputs(comfyui, relative_output)
        outputs = []
        with installer.record_stage(timings, "collect_outputs"):
            for source in videos:
                # VHS can write both a silent intermediate and a muxed audio output.
                if source.with_name(f"{source.stem}-audio.mp4") in videos:
                    continue
                shutil.copy2(source, output_dir / source.name)
                outputs.append(source.name)
        report = {
            "workflow": workflow.name,
            "image": image.name,
            "video": video.name,
            "outputs": outputs,
            "timings_seconds": timings,
        }
        (output_dir / "run-report.json").write_text(
            json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8",
        )
    finally:
        common.stop_comfyui(process, log_file)
        image_target.unlink(missing_ok=True)
        video_target.unlink(missing_ok=True)


if __name__ == "__main__":
    main()
