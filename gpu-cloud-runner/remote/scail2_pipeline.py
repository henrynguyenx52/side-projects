#!/usr/bin/env python3
"""Prepare inputs, run the SCAIL2 UI workflow on ComfyUI, and collect MP4 output."""

import argparse
import copy
import importlib.util
import json
import os
from pathlib import Path
import shutil
import socket
import subprocess
import sys
import time
from urllib.error import URLError
from urllib.request import urlopen


VIDEO_NODE_ID = 41
IMAGE_NODE_ID = 42
OUTPUT_NODE_ID = 44
MODEL_NODE_ID = 16
TRIM_NODE_ID = 48
RESIZE_NODE_ID = 49
LOW_MEMORY_MODEL = "wan2.1_14B_SCAIL_2_fp8_scaled.safetensors"
MAX_OUTPUT_FRAMES = 450
EXTENDED_OUTPUT_FRAMES = 600
EXTENDED_NATIVE_BOUND = 704
GUARDED_GENERATION_FRAMES = 453


def parse_args():
    parser = argparse.ArgumentParser(description="SCAIL2 v4.6 end-to-end runner")
    parser.add_argument("--comfyui", required=True)
    parser.add_argument("--workflow", required=True)
    parser.add_argument("--image", required=True)
    parser.add_argument("--video", required=True)
    parser.add_argument("--output-dir", required=True)
    parser.add_argument("--port", type=int, default=8189)
    return parser.parse_args()


def load_installer(script_dir):
    path = script_dir / "scail2_installer.py"
    spec = importlib.util.spec_from_file_location("scail2_installer", path)
    if spec is None or spec.loader is None:
        raise RuntimeError(f"Không load được installer: {path}")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def comfy_executable():
    beside_python = Path(sys.executable).resolve().parent / "comfy"
    if beside_python.is_file():
        return str(beside_python)
    command = shutil.which("comfy")
    return command or ""


def installation_ready(comfyui, installer):
    if not installer.environment_files_ready(comfyui):
        return False
    for filename, (directory, _url) in installer.MODEL_SPECS.items():
        model = comfyui / "models" / directory / filename
        if not installer.model_cached(model):
            return False
    return installer.sageattention_ready(sys.executable)


def ensure_installation(comfyui, workflow, output_dir, script_dir, installer):
    if installation_ready(comfyui, installer):
        print("SCAIL2 đã cài đủ; bỏ qua bước download model", flush=True)
        installer.check_model_disk_space(comfyui, {}, output_dir)
        return
    print("Thiếu thành phần SCAIL2; chạy installer trước khi render", flush=True)
    subprocess.run([
        sys.executable,
        str(script_dir / "scail2_installer.py"),
        "--comfyui", str(comfyui),
        "--workflow", str(workflow),
        "--output-dir", str(output_dir),
    ], check=True)


def video_has_audio(source):
    probe = subprocess.run([
        "ffprobe", "-v", "error", "-select_streams", "a:0",
        "-show_entries", "stream=index", "-of", "csv=p=0", str(source),
    ], stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, check=False)
    return probe.returncode == 0 and bool(probe.stdout.strip())


def build_ffmpeg_command(source, destination, has_audio, frame_cap=MAX_OUTPUT_FRAMES):
    command = ["ffmpeg", "-y", "-hide_banner", "-loglevel", "warning", "-i", str(source)]
    if has_audio:
        command += ["-map", "0:v:0", "-map", "0:a:0", "-af", "apad"]
    else:
        command += [
            "-f", "lavfi", "-i", "anullsrc=channel_layout=stereo:sample_rate=48000",
            "-map", "0:v:0", "-map", "1:a:0",
        ]
    filters = ["fps=30"]
    if frame_cap == EXTENDED_OUTPUT_FRAMES:
        # Bound the input before ComfyUI materializes 600 RGB frames in RAM.
        bound = EXTENDED_NATIVE_BOUND
        filters.append(
            f"scale=w='min({bound},iw)':h='min({bound},ih)':"
            "force_original_aspect_ratio=decrease:force_divisible_by=2,setsar=1"
        )
    filters.append(f"tpad=stop_mode=clone:stop_duration={frame_cap // 30}")
    command += [
        "-vf", ",".join(filters), "-frames:v", str(frame_cap),
        "-c:v", "libx264", "-preset", "fast", "-crf", "16",
        "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "192k",
        "-shortest", "-movflags", "+faststart", str(destination),
    ]
    return command


def normalize_video(source, destination, frame_cap=MAX_OUTPUT_FRAMES):
    print(f"Chuẩn hóa driving video: 30 FPS CFR, {frame_cap} frame (clip ngắn lặp frame cuối)", flush=True)
    has_audio = video_has_audio(source)
    print("Giữ audio gốc" if has_audio else "Video không có audio; thêm silent AAC track", flush=True)
    subprocess.run(build_ffmpeg_command(source, destination, has_audio, frame_cap), check=True)
    if not destination.is_file() or destination.stat().st_size == 0:
        raise RuntimeError("FFmpeg không tạo được driving video đã chuẩn hóa")


def find_node(workflow, node_id, expected_type):
    for node in workflow.get("nodes", []):
        if node.get("id") == node_id:
            if node.get("type") != expected_type:
                raise RuntimeError(f"Node {node_id} phải là {expected_type}, hiện là {node.get('type')}")
            return node
    raise RuntimeError(f"Không tìm thấy node {node_id} ({expected_type})")


def disconnect_input(workflow, node, input_name):
    input_slot = next((item for item in node.get("inputs", []) if item.get("name") == input_name), None)
    if input_slot is None:
        raise RuntimeError(f"Node {node.get('id')} không có input {input_name}")
    link_id = input_slot.get("link")
    if link_id is None:
        return
    input_slot["link"] = None
    workflow["links"] = [
        link for link in workflow.get("links", [])
        if (link[0] if isinstance(link, list) else link.get("id")) != link_id
    ]
    for candidate in workflow.get("nodes", []):
        for output in candidate.get("outputs", []):
            if isinstance(output.get("links"), list):
                output["links"] = [item for item in output["links"] if item != link_id]


def bypass_resize_for_native_video(workflow):
    """Feed native frames to VHS; the runner upscales after ComfyUI exits."""
    trim_node = find_node(workflow, TRIM_NODE_ID, "ImageFromBatch")
    resize_node = find_node(workflow, RESIZE_NODE_ID, "ImageResizeKJv2")
    output_node = find_node(workflow, OUTPUT_NODE_ID, "VHS_VideoCombine")
    resize_input = next(item for item in resize_node.get("inputs", []) if item.get("name") == "image")
    output_input = next(item for item in output_node.get("inputs", []) if item.get("name") == "images")
    native_link_id = resize_input.get("link")
    resize_link_id = output_input.get("link")
    if native_link_id is None and resize_link_id is not None:
        current_link = next((link for link in workflow.get("links", []) if link[0] == resize_link_id), None)
        if current_link is not None and current_link[1] == TRIM_NODE_ID and current_link[3] == OUTPUT_NODE_ID:
            return
    if native_link_id is None or resize_link_id is None:
        raise RuntimeError("Không tìm thấy link resize/output của workflow SCAIL2")

    native_link = next((link for link in workflow.get("links", []) if link[0] == native_link_id), None)
    if native_link is None or native_link[1] != TRIM_NODE_ID:
        raise RuntimeError("Link native frames không còn xuất phát từ ImageFromBatch")
    native_link[3] = OUTPUT_NODE_ID
    native_link[4] = 0
    native_link[5] = "IMAGE"
    output_input["link"] = native_link_id
    resize_input["link"] = None
    workflow["links"] = [link for link in workflow.get("links", []) if link[0] != resize_link_id]

    for output in trim_node.get("outputs", []):
        if output.get("name") == "IMAGE":
            output["links"] = [native_link_id]
    for output in resize_node.get("outputs", []):
        if isinstance(output.get("links"), list):
            output["links"] = [link for link in output["links"] if link != resize_link_id]


def configure_15_second_duration(workflow):
    """Generate 453 (4n+1) guarded frames and trim to 450 / 15 seconds."""
    video_node = find_node(workflow, VIDEO_NODE_ID, "VHS_LoadVideo")
    sampler_node = find_node(workflow, 21, "SCAIL2SimpleVideo")
    trim_node = find_node(workflow, TRIM_NODE_ID, "ImageFromBatch")
    last_frame_node = find_node(workflow, 50, "ImageFromBatch")
    first_guard_node = find_node(workflow, 51, "ImageBatch")
    fit_node = find_node(workflow, 1, "SCAIL2FitVideo")

    video_node["widgets_values"]["frame_load_cap"] = MAX_OUTPUT_FRAMES
    video_node["title"] = "DRIVING: load up to 450 native 30fps frames (15 seconds)"
    last_frame_node["widgets_values"] = [MAX_OUTPUT_FRAMES - 1, 1]
    last_frame_node["title"] = "LAST FRAME ONLY | index 449 for 15-second guard"
    sampler_values = sampler_node.get("widgets_values")
    if not isinstance(sampler_values, list) or len(sampler_values) < 7:
        raise RuntimeError("Node SCAIL2SimpleVideo không có max_frames hợp lệ")
    sampler_values[6] = GUARDED_GENERATION_FRAMES
    sampler_node["title"] = "SCAIL2 V4.6 FULL | 453 guarded → 450 output frames | 4 steps"
    trim_node["widgets_values"] = [0, MAX_OUTPUT_FRAMES]
    trim_node["title"] = "OUTPUT TRIM | first 450 frames = exactly 15 seconds at 30 FPS"

    # Start from the original first guard node and deterministically append the
    # same last frame two more times: 450 + 3 = 453, which satisfies 4n+1.
    workflow["nodes"] = [node for node in workflow.get("nodes", []) if node.get("id") not in {53, 54}]
    second_guard_node = copy.deepcopy(first_guard_node)
    second_guard_node["id"] = 53
    second_guard_node["pos"] = [1880, 266]
    second_guard_node["order"] = 21
    second_guard_node["title"] = "WAN guard 2/3 | 451 + 1 = 452"
    second_guard_node["inputs"][0]["link"] = 67
    second_guard_node["inputs"][1]["link"] = 68
    second_guard_node["outputs"][0]["links"] = [69]
    third_guard_node = copy.deepcopy(first_guard_node)
    third_guard_node["id"] = 54
    third_guard_node["pos"] = [2190, 266]
    third_guard_node["order"] = 22
    third_guard_node["title"] = "WAN guard 3/3 | 452 + 1 = 453 (4n+1)"
    third_guard_node["inputs"][0]["link"] = 69
    third_guard_node["inputs"][1]["link"] = 70
    third_guard_node["outputs"][0]["links"] = [71]
    workflow["nodes"].extend([second_guard_node, third_guard_node])

    first_guard_node["title"] = "WAN guard 1/3 | 450 + 1 = 451"
    first_guard_node["outputs"][0]["links"] = [67]
    last_frame_node["outputs"][0]["links"] = [66, 68, 70]
    next(item for item in fit_node["inputs"] if item.get("name") == "video")["link"] = 71
    workflow["links"] = [link for link in workflow.get("links", []) if link[0] not in {67, 68, 69, 70, 71}]
    workflow["links"].extend([
        [67, 51, 0, 53, 0, "IMAGE"],
        [68, 50, 0, 53, 1, "IMAGE"],
        [69, 53, 0, 54, 0, "IMAGE"],
        [70, 50, 0, 54, 1, "IMAGE"],
        [71, 54, 0, 1, 0, "IMAGE"],
    ])
    workflow["last_node_id"] = max(int(workflow.get("last_node_id", 0)), 54)
    workflow["last_link_id"] = max(int(workflow.get("last_link_id", 0)), 71)


def detect_sage_attention_mode():
    import torch

    capability = torch.cuda.get_device_capability()
    if capability >= (8, 9):
        mode = "sageattn_qk_int8_pv_fp8_cuda++"
    else:
        mode = "sageattn_qk_int8_pv_fp16_cuda"
    print(f"GPU compute capability {capability[0]}.{capability[1]} → {mode}", flush=True)
    return mode


def patch_workflow(source, destination, image_name, video_name, output_prefix, sage_attention_mode=None):
    with source.open(encoding="utf-8") as handle:
        workflow = json.load(handle)

    image_node = find_node(workflow, IMAGE_NODE_ID, "LoadImage")
    image_values = image_node.get("widgets_values")
    if not isinstance(image_values, list) or not image_values:
        raise RuntimeError("Node LoadImage không có widgets_values hợp lệ")
    image_values[0] = image_name

    video_node = find_node(workflow, VIDEO_NODE_ID, "VHS_LoadVideo")
    video_values = video_node.get("widgets_values")
    if not isinstance(video_values, dict):
        raise RuntimeError("Node VHS_LoadVideo không có widgets_values hợp lệ")
    video_values["video"] = video_name
    video_values["force_rate"] = 30.0
    # New VideoHelperSuite versions expose force_rate as FLOAT. The original
    # workflow connected it to an Int node, which comfy-cli correctly rejects.
    disconnect_input(workflow, video_node, "force_rate")
    if video_values.get("frame_load_cap") != EXTENDED_OUTPUT_FRAMES:
        configure_15_second_duration(workflow)

    output_node = find_node(workflow, OUTPUT_NODE_ID, "VHS_VideoCombine")
    output_values = output_node.get("widgets_values")
    if not isinstance(output_values, dict):
        raise RuntimeError("Node VHS_VideoCombine không có widgets_values hợp lệ")
    output_values["filename_prefix"] = output_prefix
    output_values["frame_rate"] = 30
    output_values["no_preview"] = True
    output_node["title"] = "LOW MEMORY NATIVE OUTPUT | runner upscales after ComfyUI exits"

    # Holding 450 float frames at 1080x1920 costs roughly 11.2 GiB. Keep the
    # frames at their native generation size inside ComfyUI, encode them, then
    # upscale the MP4 only after ComfyUI (and its models) has been terminated.
    bypass_resize_for_native_video(workflow)

    model_node = find_node(workflow, MODEL_NODE_ID, "DiffusionModelLoaderKJ")
    model_values = model_node.get("widgets_values")
    if not isinstance(model_values, list) or len(model_values) < 5:
        raise RuntimeError("Node DiffusionModelLoaderKJ không có widgets_values hợp lệ")
    model_values[0] = LOW_MEMORY_MODEL
    model_values[4] = sage_attention_mode or detect_sage_attention_mode()

    destination.write_text(json.dumps(workflow, ensure_ascii=False), encoding="utf-8")
    return video_values["frame_load_cap"]


def reserve_port(preferred):
    for port in range(preferred, preferred + 20):
        with socket.socket() as sock:
            try:
                sock.bind(("127.0.0.1", port))
            except OSError:
                continue
            return port
    raise RuntimeError("Không tìm được local port trống cho ComfyUI")


def server_ready(port):
    try:
        with urlopen(f"http://127.0.0.1:{port}/system_stats", timeout=2) as response:
            return response.status == 200
    except (OSError, URLError):
        return False


def get_history(port, prompt_id):
    try:
        with urlopen(f"http://127.0.0.1:{port}/history/{prompt_id}", timeout=5) as response:
            return json.load(response).get(prompt_id)
    except (OSError, URLError, json.JSONDecodeError):
        return None


def recover_disconnected_job(port, prompt_id, timeout=300):
    print(f"WebSocket bị ngắt; kiểm tra history của job {prompt_id}", flush=True)
    deadline = time.monotonic() + timeout
    while time.monotonic() < deadline:
        if not server_ready(port):
            return False
        history = get_history(port, prompt_id)
        if history:
            status = history.get("status", {})
            if status.get("completed") and status.get("status_str") == "success":
                print("Job đã hoàn tất trên server; phục hồi thành công từ /history", flush=True)
                return True
            if status.get("completed") or status.get("status_str") in {"error", "failed"}:
                raise RuntimeError(f"ComfyUI history báo lỗi: {status}")
        time.sleep(3)
    return False


def start_comfyui(comfyui, port, log_path):
    log_file = log_path.open("w", encoding="utf-8")
    process = subprocess.Popen(
        [sys.executable, str(comfyui / "main.py"), "--listen", "127.0.0.1", "--port", str(port)],
        cwd=comfyui,
        stdout=log_file,
        stderr=subprocess.STDOUT,
        start_new_session=True,
    )
    deadline = time.monotonic() + 240
    while time.monotonic() < deadline:
        if process.poll() is not None:
            log_file.close()
            tail = log_path.read_text(encoding="utf-8", errors="replace")[-4000:]
            raise RuntimeError(f"ComfyUI dừng khi khởi động (exit {process.returncode}):\n{tail}")
        if server_ready(port):
            print(f"ComfyUI sẵn sàng tại 127.0.0.1:{port}", flush=True)
            return process, log_file
        time.sleep(2)
    process.terminate()
    log_file.close()
    raise RuntimeError(f"ComfyUI không sẵn sàng sau 240 giây; xem {log_path}")


def run_workflow(workflow, port):
    environment = os.environ.copy()
    environment["COMFY_LOCAL_URL"] = f"http://127.0.0.1:{port}"
    command = [
        comfy_executable(), "--json-stream", "run",
        "--workflow", str(workflow),
        "--where", "local",
        "--wait", "--timeout", "3600",
        "--output-node-ids", str(OUTPUT_NODE_ID),
    ]
    print("Queue workflow SCAIL2 qua comfy-cli", flush=True)
    process = subprocess.Popen(
        command,
        env=environment,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        bufsize=1,
    )
    terminal = None
    execution_error = None
    prompt_id = None
    assert process.stdout is not None
    for raw_line in process.stdout:
        line = raw_line.rstrip()
        if not line:
            continue
        print(line, flush=True)
        try:
            event = json.loads(line)
        except json.JSONDecodeError:
            continue
        event_data = event.get("data") if isinstance(event.get("data"), dict) else {}
        prompt_id = event.get("prompt_id") or event_data.get("prompt_id") or prompt_id
        if event.get("type") == "envelope":
            terminal = event
        elif event.get("event") in {"execution_error", "execution_interrupted"}:
            execution_error = event
    code = process.wait()
    if execution_error:
        raise RuntimeError(f"ComfyUI execution failed: {execution_error}")
    if terminal and terminal.get("ok") is False:
        error = terminal.get("error") or {}
        details = error.get("details") or {}
        prompt_id = details.get("prompt_id") or prompt_id
        if error.get("code") == "ws_disconnected" and prompt_id and recover_disconnected_job(port, prompt_id):
            return prompt_id
        raise RuntimeError(f"ComfyUI trả lỗi: {error}")
    if code != 0:
        raise RuntimeError(f"comfy run thất bại với exit code {code}")
    return prompt_id


def find_outputs(comfyui, relative_output_dir):
    source_dir = comfyui / "output" / relative_output_dir
    videos = sorted(source_dir.rglob("*.mp4")) if source_dir.is_dir() else []
    if not videos:
        raise RuntimeError(f"Workflow hoàn tất nhưng không tìm thấy MP4 trong {source_dir}")
    return videos


def build_upscale_command(source, destination):
    return [
        "ffmpeg", "-y", "-hide_banner", "-loglevel", "warning",
        "-i", str(source),
        "-map", "0:v:0", "-map", "0:a?",
        "-vf", "scale=1080:1920:force_original_aspect_ratio=increase:flags=lanczos,crop=1080:1920",
        "-c:v", "libx264", "-preset", "fast", "-crf", "12", "-pix_fmt", "yuv420p",
        "-c:a", "copy", "-movflags", "+faststart", str(destination),
    ]


def upscale_outputs(sources, local_output_dir):
    outputs = []
    for source in sources:
        destination = local_output_dir / source.name
        temporary = destination.with_name(destination.stem + ".upscaling.mp4")
        print(f"Upscale sau khi đã giải phóng ComfyUI: {source.name} → 1080x1920", flush=True)
        subprocess.run(build_upscale_command(source, temporary), check=True)
        if not temporary.is_file() or temporary.stat().st_size == 0:
            raise RuntimeError(f"FFmpeg không tạo được output 1080x1920: {temporary}")
        temporary.replace(destination)
        outputs.append(destination)
        print(f"Thu output: {destination.name} ({destination.stat().st_size / 2**20:.1f} MiB)", flush=True)
    return outputs


def stop_comfyui(process, log_file):
    if process is not None and process.poll() is None:
        process.terminate()
        try:
            process.wait(timeout=20)
        except subprocess.TimeoutExpired:
            process.kill()
            process.wait(timeout=10)
    if log_file is not None and not log_file.closed:
        log_file.close()


def main():
    args = parse_args()
    comfyui = Path(args.comfyui).expanduser().resolve()
    workflow = Path(args.workflow).resolve()
    image = Path(args.image).resolve()
    video = Path(args.video).resolve()
    output_dir = Path(args.output_dir).resolve()
    output_dir.mkdir(parents=True, exist_ok=True)
    script_dir = Path(__file__).resolve().parent

    if not image.is_file() or not video.is_file() or not workflow.is_file():
        raise RuntimeError("Thiếu ảnh, video hoặc workflow trên remote")

    installer = load_installer(script_dir)
    timings = {}
    with installer.record_stage(timings, "setup"):
        ensure_installation(comfyui, workflow, output_dir, script_dir, installer)
    job_tag = workflow.parent.name.replace("/", "_")
    comfy_input_root = comfyui / "input"
    comfy_input_root.mkdir(parents=True, exist_ok=True)
    input_prefix = f"gpu-cloud-runner-{job_tag}"
    image_target = comfy_input_root / f"{input_prefix}-reference{image.suffix.lower() or '.png'}"
    # VHS enumerates videos from the input root when ComfyUI starts. Keeping the
    # generated video at the root makes it appear in the server's COMBO options.
    video_target = comfy_input_root / f"{input_prefix}-driving-30fps.mp4"
    relative_output_dir = Path("gpu-cloud-runner") / job_tag
    patched_workflow = workflow.parent / "scail2-run.json"
    frame_cap = patch_workflow(
        workflow,
        patched_workflow,
        image_target.name,
        video_target.name,
        (relative_output_dir / "SCAIL2_V46_FAST_FULL").as_posix(),
        detect_sage_attention_mode(),
    )
    print(f"Workflow đã patch: model node {MODEL_NODE_ID}, image node {IMAGE_NODE_ID}, video node {VIDEO_NODE_ID}, output node {OUTPUT_NODE_ID}", flush=True)

    port = reserve_port(args.port)
    comfy_log = output_dir / "comfyui.log"
    process = None
    log_file = None
    try:
        with installer.record_stage(timings, "prepare_inputs"):
            shutil.copy2(image, image_target)
            normalize_video(video, video_target, frame_cap)
        with installer.record_stage(timings, "comfyui_start"):
            process, log_file = start_comfyui(comfyui, port, comfy_log)
        try:
            with installer.record_stage(timings, "render"):
                run_workflow(patched_workflow, port)
        except Exception as error:
            if log_file is not None:
                log_file.flush()
            tail = comfy_log.read_text(encoding="utf-8", errors="replace")[-8000:] if comfy_log.is_file() else ""
            suffix = f"\n--- ComfyUI log tail ---\n{tail}" if tail else ""
            raise RuntimeError(f"{error}{suffix}") from error
        native_videos = find_outputs(comfyui, relative_output_dir)
        # Reclaim FP8 diffusion/VAE/SAM/T5 memory before CPU-side upscale.
        stop_comfyui(process, log_file)
        process = None
        log_file = None
        with installer.record_stage(timings, "upscale"):
            videos = upscale_outputs(native_videos, output_dir)
        report = {
            "workflow": workflow.name,
            "image": image.name,
            "video": video.name,
            "normalized_video": str(video_target),
            "outputs": [path.name for path in videos],
            "timings_seconds": timings,
            "completed_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        }
        (output_dir / "run-report.json").write_text(
            json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
        )
        print(f"Hoàn tất SCAIL2: {len(videos)} MP4", flush=True)
    finally:
        stop_comfyui(process, log_file)
        image_target.unlink(missing_ok=True)
        video_target.unlink(missing_ok=True)


if __name__ == "__main__":
    main()
