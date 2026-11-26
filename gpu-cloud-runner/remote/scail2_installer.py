#!/usr/bin/env python3
"""Install the exact ComfyUI dependencies referenced by the SCAIL2 v4.6 workflow."""

import argparse
from concurrent.futures import ThreadPoolExecutor
from contextlib import contextmanager
import fcntl
import hashlib
import json
import os
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile
import time
from urllib.request import urlopen


MODEL_SPECS = {
    "sam3.1_multiplex_fp16.safetensors": (
        "checkpoints",
        "https://huggingface.co/Comfy-Org/sam3.1/resolve/main/checkpoints/sam3.1_multiplex_fp16.safetensors",
    ),
    "umt5_xxl_fp8_e4m3fn_scaled.safetensors": (
        "text_encoders",
        "https://huggingface.co/Comfy-Org/Wan-2.1/resolve/main/split_files/text_encoders/umt5_xxl_fp8_e4m3fn_scaled.safetensors",
    ),
    "clip_vision_vit_h.safetensors": (
        "clip_vision",
        "https://huggingface.co/lllyasviel/misc/resolve/main/clip_vision_vit_h.safetensors",
    ),
    "wan2.1_14B_SCAIL_2_fp8_scaled.safetensors": (
        "diffusion_models",
        "https://huggingface.co/Comfy-Org/SCAIL-2/resolve/main/diffusion_models/wan2.1_14B_SCAIL_2_fp8_scaled.safetensors",
    ),
    "wan2.1_SCAIL_2_DPO_lora_bf16.safetensors": (
        "loras",
        "https://huggingface.co/Comfy-Org/SCAIL-2/resolve/main/loras/wan2.1_SCAIL_2_DPO_lora_bf16.safetensors",
    ),
    "lightx2v_I2V_14B_480p_cfg_step_distill_rank256_bf16.safetensors": (
        "loras",
        "https://huggingface.co/Kijai/WanVideo_comfy/resolve/main/Lightx2v/lightx2v_I2V_14B_480p_cfg_step_distill_rank256_bf16.safetensors",
    ),
    "wan_2.1_vae.safetensors": (
        "vae",
        "https://huggingface.co/Comfy-Org/Wan-2.1/resolve/main/split_files/vae/wan_2.1_vae.safetensors",
    ),
}

# The authored workflow points at the high-memory FP16 checkpoint. Cloud jobs
# intentionally install the official scaled FP8 variant instead: it leaves
# enough system RAM for the final VAE decode on 24 GiB GPUs / 48 GiB runners.
MODEL_REPLACEMENTS = {
    "wan2.1_14B_SCAIL_2_fp16.safetensors": "wan2.1_14B_SCAIL_2_fp8_scaled.safetensors",
}

SAGE_WHEEL_REPO = "pixeloven/SageAttention-Wheels"
DOWNLOAD_WORKERS = 3
OUTPUT_RESERVE_BYTES = 2 * 2**30
PENDING_REQUIREMENTS = ".scail2-requirements-pending"

MODEL_NODE_TYPES = {
    "CheckpointLoaderSimple",
    "CLIPLoader",
    "CLIPVisionLoader",
    "DiffusionModelLoaderKJ",
    "LoraLoaderModelOnly",
    "VAELoader",
}

CUSTOM_NODES = {
    "ComfyUI-SCAIL2-Easy": "https://github.com/jieg9341-lab/ComfyUI-SCAIL2-Easy.git",
    "ComfyUI-KJNodes": "https://github.com/kijai/ComfyUI-KJNodes.git",
    "ComfyUI-VideoHelperSuite": "https://github.com/Kosinkadink/ComfyUI-VideoHelperSuite.git",
    "ComfyUI_essentials": "https://github.com/cubiq/ComfyUI_essentials.git",
    "ComfyLiterals": "https://github.com/M1kep/ComfyLiterals.git",
}


def run(args, cwd=None, env=None):
    print("+", " ".join(map(str, args)), flush=True)
    subprocess.run(args, cwd=cwd, env=env, check=True)


def ensure_repository(url, destination, *, missing):
    pending = destination / PENDING_REQUIREMENTS
    if missing:
        run(["git", "clone", "--depth", "1", url, str(destination)])
        pending.touch()
    if pending.is_file():
        install_requirements(sys.executable, destination)
        pending.unlink()


def workflow_models(workflow_path):
    with workflow_path.open(encoding="utf-8") as handle:
        workflow = json.load(handle)
    names = set()
    for node in workflow.get("nodes", []):
        if node.get("type") not in MODEL_NODE_TYPES:
            continue
        values = node.get("widgets_values") or []
        if isinstance(values, list) and values and isinstance(values[0], str):
            names.add(Path(values[0]).name)
    known_workflow_names = set(MODEL_SPECS) | set(MODEL_REPLACEMENTS)
    unknown = sorted(names - known_workflow_names)
    if unknown:
        raise RuntimeError("Workflow có model chưa được ánh xạ URL: " + ", ".join(unknown))
    resolved_names = {MODEL_REPLACEMENTS.get(name, name) for name in names}
    if resolved_names != MODEL_SPECS.keys():
        missing = sorted(MODEL_SPECS.keys() - resolved_names)
        raise RuntimeError("Workflow không còn khớp manifest SCAIL2 v4.6; thiếu: " + ", ".join(missing))
    return sorted(resolved_names)


def download(url, destination):
    destination.parent.mkdir(parents=True, exist_ok=True)
    # Coordinate FP8 and FP16 jobs that share the same models and .part files.
    with destination.with_name(f".{destination.name}.lock").open("a") as lock:
        fcntl.flock(lock, fcntl.LOCK_EX)
        return download_locked(url, destination)


def model_cached(destination):
    return destination.is_file() and destination.stat().st_size > 1024 * 1024


def model_remote_size(url):
    result = subprocess.run(
        ["curl", "-fsSIL", "--connect-timeout", "5", "--max-time", "15", url],
        check=True, capture_output=True, text=True,
    )
    for block in reversed(result.stdout.strip().split("\n\n")):
        headers = dict(
            (key.lower(), value.strip())
            for key, _, value in (line.partition(":") for line in block.splitlines())
            if value
        )
        # Resolver redirects can advertise the model size even when the CDN omits it.
        if headers.get("x-linked-size", "").isdigit():
            return int(headers["x-linked-size"])
    final = result.stdout.strip().split("\n\n")[-1]
    for line in final.splitlines():
        key, _, value = line.partition(":")
        if key.lower() == "content-length" and value.strip().isdigit():
            return int(value)
    raise ValueError("Nguồn tải không trả dung lượng model")


def check_model_disk_space(comfyui, models, output_dir):
    # Group by filesystem so model and output mounts are checked independently.
    required = {}

    def add(directory, size):
        directory.mkdir(parents=True, exist_ok=True)
        device = directory.stat().st_dev
        first_path, total = required.get(device, (directory, 0))
        required[device] = (first_path, total + size)

    add(comfyui / "output", OUTPUT_RESERVE_BYTES)
    if output_dir.stat().st_dev != (comfyui / "output").stat().st_dev:
        add(output_dir, OUTPUT_RESERVE_BYTES)

    missing = [
        (comfyui / "models" / directory / name, url)
        for name, (directory, url) in models.items()
        if not model_cached(comfyui / "models" / directory / name)
    ]

    def bytes_remaining(item):
        destination, url = item
        try:
            size = model_remote_size(url)
            if size <= 1024 * 1024:
                raise ValueError(f"Dung lượng nguồn bất thường: {size} byte")
        except (OSError, ValueError, subprocess.SubprocessError) as error:
            raise RuntimeError(f"Không xác định được dung lượng model {destination.name}: {error}") from error
        partial = destination.with_suffix(destination.suffix + ".part")
        partial_bytes = partial.stat().st_size if partial.is_file() else 0
        if partial_bytes > size:
            raise RuntimeError(f"File tải dở lớn hơn bản nguồn: {partial}")
        return destination.parent, size - partial_bytes

    with ThreadPoolExecutor(max_workers=DOWNLOAD_WORKERS) as pool:
        for directory, remaining in pool.map(bytes_remaining, missing):
            add(directory, remaining)

    for path, needed in required.values():
        free = shutil.disk_usage(path).free
        print(f"Disk {path}: còn {free / 2**30:.2f} GiB, cần {needed / 2**30:.2f} GiB (gồm dự phòng output nếu dùng chung ổ)", flush=True)
        if free < needed:
            raise RuntimeError(
                f"Không đủ dung lượng tại {path}: còn {free / 2**30:.2f} GiB, "
                f"cần {needed / 2**30:.2f} GiB. Hãy tăng disk trên instance."
            )


@contextmanager
def record_stage(timings, name):
    started = time.monotonic()
    try:
        yield
    finally:
        seconds = round(time.monotonic() - started, 3)
        timings[name] = seconds
        print(f"Thời gian {name}: {seconds:.3f}s", flush=True)


def download_locked(url, destination):
    if model_cached(destination):
        print(f"Đã có, bỏ qua: {destination.name} ({destination.stat().st_size / 2**30:.2f} GiB)", flush=True)
        return "existing"
    partial = destination.with_suffix(destination.suffix + ".part")
    run([
        "curl", "--fail", "--location", "--retry", "8", "--retry-all-errors",
        "--continue-at", "-", "--output", str(partial), url,
    ])
    if partial.stat().st_size <= 1024 * 1024:
        raise RuntimeError(f"File tải về quá nhỏ: {partial}")
    partial.replace(destination)
    return "downloaded"


def download_models(comfyui, models):
    def install_model(item):
        name, (directory, url) = item
        destination = comfyui / "models" / directory / name
        state = download(url, destination)
        return {
            "name": name, "directory": directory, "path": str(destination),
            "bytes": destination.stat().st_size, "state": state, "url": url,
        }

    # Start the main checkpoint immediately so smaller files can finish alongside it.
    ordered = sorted(models.items(), key=lambda item: item[1][0] != "diffusion_models")
    print(f"Kiểm tra và tải model (tối đa {DOWNLOAD_WORKERS} lượt đồng thời)", flush=True)
    with ThreadPoolExecutor(max_workers=DOWNLOAD_WORKERS) as pool:
        return list(pool.map(install_model, ordered))


def install_requirements(python, directory):
    requirements = directory / "requirements.txt"
    if requirements.is_file():
        run([python, "-m", "pip", "install", "-r", str(requirements)])


def comfy_executable():
    beside_python = Path(sys.executable).resolve().parent / "comfy"
    return str(beside_python) if beside_python.is_file() else shutil.which("comfy") or ""


def environment_files_ready(comfyui):
    repositories = [comfyui, *(comfyui / "custom_nodes" / name for name in CUSTOM_NODES)]
    return (
        (comfyui / "main.py").is_file()
        and all(repo.is_dir() and not (repo / PENDING_REQUIREMENTS).exists() for repo in repositories)
        and comfy_executable()
        and shutil.which("ffmpeg")
    )


def ensure_environment(comfyui, timings=None):
    if timings is None:
        timings = {}
    comfyui.parent.mkdir(parents=True, exist_ok=True)
    # Never install packages into the shared Python environment concurrently.
    with (comfyui.parent / f".{comfyui.name}-scail2-setup.lock").open("a") as lock:
        fcntl.flock(lock, fcntl.LOCK_EX)
        print("Kiểm tra SageAttention trước khi cài ComfyUI và tải model", flush=True)
        with record_stage(timings, "sageattention"):
            install_sageattention(sys.executable)
        with record_stage(timings, "dependencies"):
            if environment_files_ready(comfyui):
                return

            ensure_repository(
                "https://github.com/Comfy-Org/ComfyUI.git", comfyui,
                missing=not (comfyui / "main.py").is_file(),
            )
            ensure_ffmpeg()
            if not comfy_executable():
                run([sys.executable, "-m", "pip", "install", "comfy-cli>=1.24,<2"])

            custom_root = comfyui / "custom_nodes"
            custom_root.mkdir(parents=True, exist_ok=True)
            for name, url in CUSTOM_NODES.items():
                destination = custom_root / name
                ensure_repository(url, destination, missing=not destination.is_dir())
        # Installing requirements can replace PyTorch or another kernel dependency.
        with record_stage(timings, "sageattention_recheck"):
            if not sageattention_ready(sys.executable):
                raise RuntimeError(
                    "Dừng setup: kernel SageAttention không còn chạy sau khi cài dependencies. "
                    "Hãy chọn instance khác."
                )


def install_models(comfyui, models, output_dir, timings):
    ensure_environment(comfyui, timings)
    with record_stage(timings, "disk_check"):
        check_model_disk_space(comfyui, models, output_dir)
    with record_stage(timings, "model_download"):
        return download_models(comfyui, models)


def ensure_ffmpeg():
    if shutil.which("ffmpeg"):
        return
    if shutil.which("apt-get") and os.geteuid() == 0:
        print("Cài FFmpeg để chuẩn hóa driving video", flush=True)
        run(["apt-get", "update"])
        run(["apt-get", "install", "-y", "ffmpeg"])
        return
    raise RuntimeError("Không tìm thấy ffmpeg; hãy dùng GPU image có ffmpeg hoặc quyền root để cài")


SAGE_KERNEL_CHECK = """
from pathlib import Path
import sys
import torch
import sageattention as sa

if len(sys.argv) > 1:
    assert Path(sys.argv[1]).resolve() in Path(sa.__file__).resolve().parents
if torch.cuda.get_device_capability() >= (8, 9):
    kernel = sa.sageattn_qk_int8_pv_fp8_cuda
    accumulation = "fp32+fp16"
else:
    kernel = sa.sageattn_qk_int8_pv_fp16_cuda
    accumulation = "fp32"
torch.manual_seed(0)
q, k, v = [torch.randn(1, 4, 512, 128, device="cuda", dtype=torch.float16) for _ in range(3)]
out = kernel(q, k, v, tensor_layout="HND", pv_accum_dtype=accumulation)
ref = torch.nn.functional.scaled_dot_product_attention(q, k, v)
torch.cuda.synchronize()
assert out.shape == ref.shape and torch.isfinite(out).all().item()
relative_error = ((out.float() - ref.float()).norm() / ref.float().norm()).item()
assert relative_error < 0.25, f"SageAttention relative error: {relative_error:.4f}"
"""


def sageattention_ready(python, staging=None):
    command = [python, "-c", SAGE_KERNEL_CHECK]
    env = None
    if staging is not None:
        command.append(str(staging))
        env = os.environ.copy()
        env["PYTHONPATH"] = os.pathsep.join(filter(None, [str(staging), env.get("PYTHONPATH")]))
    try:
        result = subprocess.run(command, env=env, capture_output=True, text=True, timeout=60)
    except subprocess.TimeoutExpired:
        print("Kiểm tra kernel SageAttention quá 60 giây", flush=True)
        return False
    if result.returncode != 0 and (staging is not None or "ModuleNotFoundError" not in result.stderr):
        print(result.stderr.strip() or f"SageAttention exit {result.returncode}", flush=True)
    return result.returncode == 0


def sage_wheel_name(python):
    probe = """
import json, platform, sys, torch
print(json.dumps({
    "python": "cp%d%d" % sys.version_info[:2],
    "implementation": platform.python_implementation(),
    "platform": sys.platform,
    "machine": platform.machine(),
    "torch": torch.__version__.split("+")[0],
    "cuda": torch.version.cuda,
    "sm": "".join(map(str, torch.cuda.get_device_capability())),
}))
"""
    result = subprocess.run([python, "-c", probe], check=True, capture_output=True, text=True, timeout=30)
    info = json.loads(result.stdout)
    print(f"Cấu hình tìm wheel SageAttention: {info}", flush=True)
    if (info["platform"], info["machine"], info["implementation"]) != ("linux", "x86_64", "CPython") or not info["cuda"]:
        raise RuntimeError("Nguồn wheel hiện yêu cầu Linux x86_64, CPython và PyTorch CUDA")
    tag = info["python"]
    cuda = info["cuda"].replace(".", "")
    return f"sageattention-2.2.0+cu{cuda}.torch{info['torch']}.sm{info['sm']}-{tag}-{tag}-linux_x86_64.whl"


def find_sage_wheel(filename):
    api = f"https://api.github.com/repos/{SAGE_WHEEL_REPO}/releases?per_page=30"
    with urlopen(api, timeout=15) as response:
        releases = json.load(response)
    prefix = f"https://github.com/{SAGE_WHEEL_REPO}/releases/download/"
    for release in releases:
        if release.get("draft") or release.get("prerelease"):
            continue
        for asset in release.get("assets", []):
            if asset.get("name") != filename:
                continue
            url = asset.get("browser_download_url") or ""
            digest = asset.get("digest") or ""
            if url.startswith(prefix) and digest.startswith("sha256:") and len(digest) == 71:
                return url, digest.removeprefix("sha256:")
    raise RuntimeError(f"Không tìm thấy wheel đã phát hành đúng cấu hình: {filename}")


def install_sageattention(python):
    if sageattention_ready(python):
        print("SageAttention đã vượt qua kiểm tra kernel GPU; dùng bản đang cài", flush=True)
        return

    try:
        filename = sage_wheel_name(python)
        url, sha256 = find_sage_wheel(filename)
        with tempfile.TemporaryDirectory(prefix="scail2-sage-wheel-") as temporary:
            wheel = Path(temporary) / filename
            staging = Path(temporary) / "probe"
            run(["curl", "--fail", "--location", "--connect-timeout", "10",
                 "--max-time", "90", "--output", str(wheel), url])
            if hashlib.sha256(wheel.read_bytes()).hexdigest() != sha256:
                raise RuntimeError("SHA-256 của wheel không khớp metadata phát hành")
            pip = [python, "-m", "pip", "install", "--no-index", "--no-deps"]
            run([*pip, "--target", str(staging), str(wheel)])
            if not sageattention_ready(python, staging=staging):
                raise RuntimeError(f"Wheel không vượt qua kiểm tra kernel GPU: {filename}")
            run([*pip, "--force-reinstall", str(wheel)])
            if not sageattention_ready(python):
                raise RuntimeError(f"Kernel không chạy sau khi cài wheel: {filename}")
        print(f"Đã cài và kiểm tra SageAttention từ wheel: {filename}", flush=True)
    except (OSError, ValueError, subprocess.SubprocessError, RuntimeError) as error:
        if isinstance(error, subprocess.CalledProcessError) and error.stderr:
            print(error.stderr.strip(), flush=True)
        raise RuntimeError(f"Dừng setup SageAttention. Hãy chọn instance khác. {error}") from error


def parse_args():
    parser = argparse.ArgumentParser()
    parser.add_argument("--comfyui", required=True)
    parser.add_argument("--workflow", required=True)
    parser.add_argument("--output-dir", required=True)
    return parser.parse_args()


def main():
    args = parse_args()
    comfyui = Path(args.comfyui).expanduser().resolve()
    workflow = Path(args.workflow).resolve()
    output_dir = Path(args.output_dir).resolve()
    output_dir.mkdir(parents=True, exist_ok=True)
    models = workflow_models(workflow)

    timings = {}
    results = install_models(comfyui, {name: MODEL_SPECS[name] for name in models}, output_dir, timings)

    report = {
        "workflow": workflow.name,
        "comfyui": str(comfyui),
        "python": sys.executable,
        "custom_nodes": list(CUSTOM_NODES),
        "models": results,
        "timings_seconds": timings,
        "completed_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
    }
    report_path = output_dir / "install-report.json"
    report_path.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Hoàn tất cài workflow {workflow.name}: {len(results)} model", flush=True)
    print(f"Báo cáo: {report_path}", flush=True)


if __name__ == "__main__":
    main()
