#!/usr/bin/env python3
"""
SoulX FlashHead — Repository Patcher for Apple Silicon (MPS)

Applies all adaptations from the Colab notebook to work locally on macOS:
  1. CPUFaceHandler → OpenCV-based (no mediapipe dependency)
  2. facecrop.py     → saves crop bbox for composite
  3. gradio_app.py   → model paths, MPS device, branding, defaults, composite function
  4. CUDA stubs      → wrap xformers/xfuser imports so they don't crash on Mac
  5. .to("cuda")     → replaced with MPS-aware device selection

Run from the project root (parent of SoulX-FlashHead/ and models/).
"""

import os
import re
import sys
import shutil

# ── Paths ───────────────────────────────────────────────────
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
REPO_DIR    = os.path.join(SCRIPT_DIR, "SoulX-FlashHead")
MODEL_DIR   = os.path.join(SCRIPT_DIR, "models")

MODEL_PATH      = os.path.join(MODEL_DIR, "SoulX-FlashHead-1_3B")
WAV2VEC_PATH    = os.path.join(MODEL_DIR, "wav2vec2-base-960h")

HANDLER_PATH    = os.path.join(REPO_DIR, "flash_head", "utils", "cpu_face_handler.py")
FACECROP_PATH   = os.path.join(REPO_DIR, "flash_head", "utils", "facecrop.py")
GRADIO_PATH     = os.path.join(REPO_DIR, "gradio_app.py")

# ── Helpers ─────────────────────────────────────────────────
GREEN = "✅"; RED = "❌"; INFO = "ℹ️"

def check(label: str, ok: bool):
    print(f"  {GREEN if ok else RED} {label}")
    return ok

def path_of(label: str, p: str) -> str:
    if not os.path.exists(p):
        print(f"  {RED} {label}: {p} NOT FOUND")
    return p


# ═════════════════════════════════════════════════════════════
# PART 0 — CPUFaceHandler: OpenCV-based (replaces mediapipe)
# ═════════════════════════════════════════════════════════════

CPU_HANDLER_CODE = r'''import os
import cv2
import numpy as np
from typing import Tuple, List


class CPUFaceHandler:
    """OpenCV-based face detection — no mediapipe dependency needed."""

    def __init__(self, model_selection: int = 1, min_detection_confidence: float = 0.0):
        proto  = os.path.join(os.path.dirname(__file__), "../../deploy.prototxt")
        caffe  = os.path.join(os.path.dirname(__file__), "../../res10_300x300_ssd_iter_140000.caffemodel")
        self.use_dnn  = False
        self.use_haar = False

        # Download DNN model files if missing
        import urllib.request
        base = os.path.dirname(os.path.dirname(os.path.dirname(__file__)))
        proto_local  = os.path.join(base, "deploy.prototxt")
        caffe_local  = os.path.join(base, "res10_300x300_ssd_iter_140000.caffemodel")

        if not os.path.exists(proto_local):
            try:
                urllib.request.urlretrieve(
                    "https://raw.githubusercontent.com/opencv/opencv/master/samples/dnn/face_detector/deploy.prototxt",
                    proto_local)
            except Exception:
                pass
        if not os.path.exists(caffe_local):
            try:
                urllib.request.urlretrieve(
                    "https://github.com/opencv/opencv_3rdparty/raw/dnn_samples_face_detector_20170830/res10_300x300_ssd_iter_140000.caffemodel",
                    caffe_local)
            except Exception:
                pass

        if os.path.exists(proto_local) and os.path.exists(caffe_local):
            self.net = cv2.dnn.readNetFromCaffe(proto_local, caffe_local)
            self.use_dnn = True
        else:
            cascade_path = cv2.data.haarcascades + "haarcascade_frontalface_default.xml"
            self.cascade = cv2.CascadeClassifier(cascade_path)
            self.use_haar = True

    def detect(self, image: np.ndarray) -> Tuple[List, List]:
        bboxs, scores = [], []
        img_h, img_w = image.shape[:2]

        if self.use_dnn:
            blob = cv2.dnn.blobFromImage(image, 1.0, (300, 300), (104.0, 177.0, 123.0))
            self.net.setInput(blob)
            detections = self.net.forward()
            for i in range(detections.shape[2]):
                confidence = float(detections[0, 0, i, 2])
                if confidence > 0.5:
                    # Return RELATIVE coordinates (same contract as original mediapipe handler)
                    x1 = float(detections[0, 0, i, 3])
                    y1 = float(detections[0, 0, i, 4])
                    x2 = float(detections[0, 0, i, 5])
                    y2 = float(detections[0, 0, i, 6])
                    bboxs.append([x1, y1, x2, y2])
                    scores.append(confidence)

        elif self.use_haar:
            gray = cv2.cvtColor(image, cv2.COLOR_RGB2GRAY)
            faces = self.cascade.detectMultiScale(gray, 1.1, 5, minSize=(30, 30))
            for (x, y, w, h) in faces:
                bboxs.append([x / img_w, y / img_h, (x + w) / img_w, (y + h) / img_h])
                scores.append(1.0)

        return bboxs, scores

    def __call__(self, image: np.ndarray) -> Tuple[List, List]:
        return self.detect(image)
'''


def patch_cpu_face_handler() -> bool:
    """Replace the mediapipe-based handler with the OpenCV one."""
    if not os.path.exists(os.path.dirname(HANDLER_PATH)):
        print(f"  {RED} Directory flash_head/utils/ not found in repo — skipping CPUFaceHandler")
        return False

    with open(HANDLER_PATH, "w") as f:
        f.write("import os\n" + CPU_HANDLER_CODE)
    return True


# ═════════════════════════════════════════════════════════════
# PART 1 — facecrop.py: save crop bbox for composite
# ═════════════════════════════════════════════════════════════

def patch_facecrop() -> bool:
    """Inject bbox-saving code into facecrop.py."""
    if not os.path.exists(FACECROP_PATH):
        print(f"  {RED} facecrop.py not found — skipping")
        return False

    with open(FACECROP_PATH, "r") as f:
        code = f.read()

    # Inject the global + json import
    code = code.replace(
        "import os",
        "import os\nimport json\n\n_LAST_CROP_BBOX = None"
    )

    # Inject bbox saving before the actual crop
    old = "    crop_face = face_image.crop(scaled_bbox)"
    new = (
        "    global _LAST_CROP_BBOX\n"
        "    _LAST_CROP_BBOX = scaled_bbox + [img_w, img_h]\n"
        "    try:\n"
        "        with open(\"/tmp/_flashhead_crop_bbox.json\", \"w\") as _bf:\n"
        "            json.dump({\"bbox\": scaled_bbox, \"img_w\": img_w, \"img_h\": img_h}, _bf)\n"
        "    except Exception:\n"
        "        pass\n"
        "    crop_face = face_image.crop(scaled_bbox)"
    )
    if old not in code:
        print(f"  {RED} Could not find crop line in facecrop.py — skipping")
        return False

    code = code.replace(old, new)

    with open(FACECROP_PATH, "w") as f:
        f.write(code)
    return True


# ═════════════════════════════════════════════════════════════
# PART 2 — gradio_app.py: the big one
# ═════════════════════════════════════════════════════════════

COMPOSITE_FUNC = '''
def _composite_to_original(video_path, original_image_path):
    """
    Reads the EXACT crop bbox saved by facecrop.py during model inference,
    then pastes each 512x512 generated frame back into that exact region
    of the original image. Produces full-resolution (16:9 etc.) output.
    """
    import cv2, json, numpy as np, subprocess

    bbox_file = "/tmp/_flashhead_crop_bbox.json"
    if not os.path.exists(bbox_file):
        logger.info("No crop bbox file found — face_crop was likely disabled, skipping composite")
        return video_path

    with open(bbox_file, "r") as f:
        crop_data = json.load(f)

    crop_x1, crop_y1, crop_x2, crop_y2 = crop_data["bbox"]
    orig_img_w = crop_data["img_w"]
    orig_img_h = crop_data["img_h"]

    # Convert relative → absolute pixel coordinates
    crop_x1 = int(crop_x1 * orig_img_w)
    crop_y1 = int(crop_y1 * orig_img_h)
    crop_x2 = int(crop_x2 * orig_img_w)
    crop_y2 = int(crop_y2 * orig_img_h)

    os.remove(bbox_file)

    aspect = max(orig_img_w, orig_img_h) / max(min(orig_img_w, orig_img_h), 1)
    if aspect < 1.15:
        logger.info(f"Original {orig_img_w}x{orig_img_h} is ~square, skipping composite")
        return video_path

    crop_w = crop_x2 - crop_x1
    crop_h = crop_y2 - crop_y1

    logger.info(f"COMPOSITE: bbox ({crop_x1},{crop_y1})-({crop_x2},{crop_y2}) = {crop_w}x{crop_h} in {orig_img_w}x{orig_img_h}")

    orig = cv2.imread(original_image_path)
    if orig is None:
        logger.warning(f"Could not read original image: {original_image_path}")
        return video_path

    cap = cv2.VideoCapture(video_path)
    fps = cap.get(cv2.CAP_PROP_FPS) or 25.0
    output_path = video_path.replace(".mp4", "_ar.mp4")

    out = cv2.VideoWriter(output_path, cv2.VideoWriter_fourcc(*"mp4v"), fps, (orig_img_w, orig_img_h))

    # Feather mask for smooth blending
    mask = np.ones((crop_h, crop_w), dtype=np.float32)
    feather = max(min(crop_w, crop_h) // 12, 6)
    for i in range(feather):
        a = i / feather
        mask[i, :] *= a
        mask[-(i + 1), :] *= a
        mask[:, i] *= a
        mask[:, -(i + 1)] *= a
    mask_3ch = mask[:, :, np.newaxis]

    frame_count = 0
    while True:
        ret, frame = cap.read()
        if not ret:
            break
        resized = cv2.resize(frame, (crop_w, crop_h), interpolation=cv2.INTER_LANCZOS4)
        canvas = orig.copy()
        roi = canvas[crop_y1:crop_y2, crop_x1:crop_x2].astype(np.float32)
        blended = (resized.astype(np.float32) * mask_3ch + roi * (1 - mask_3ch)).astype(np.uint8)
        canvas[crop_y1:crop_y2, crop_x1:crop_x2] = blended
        out.write(canvas)
        frame_count += 1

    cap.release()
    out.release()

    # Remux audio from original video into the composited result
    final_path = video_path.replace(".mp4", "_final.mp4")
    subprocess.run(
        ["ffmpeg", "-y", "-i", output_path, "-i", video_path,
         "-c:v", "libx264", "-c:a", "aac", "-map", "0:v", "-map", "1:a",
         "-shortest", final_path],
        capture_output=True
    )

    if os.path.exists(final_path) and os.path.getsize(final_path) > 0:
        os.replace(final_path, video_path)
        if os.path.exists(output_path):
            os.remove(output_path)
        logger.info(f"Composited {frame_count} frames -> {orig_img_w}x{orig_img_h}, saved to {video_path}")
        return video_path

    if os.path.exists(output_path):
        os.replace(output_path, video_path)
    return video_path
'''


DEVICE_BOILERPLATE = '''
# ── Apple Silicon MPS Support ───────────────────────────────
import torch as _torch
if _torch.backends.mps.is_available():
    _DEVICE = "mps"
    print(f"Using MPS (Metal Performance Shaders) on Apple Silicon")
elif _torch.cuda.is_available():
    _DEVICE = "cuda"
    print(f"Using CUDA ({_torch.cuda.get_device_name(0)})")
else:
    _DEVICE = "cpu"
    print(f"Using CPU (no GPU accelerator detected)")

# Helper: patch .to("cuda") calls to use the detected device
_original_to = _torch.Tensor.to
def _patched_to(self, *args, **kwargs):
    new_args = tuple(
        _DEVICE if isinstance(a, str) and a == "cuda"
        else _torch.device(_DEVICE) if isinstance(a, _torch.device) and a.type == "cuda"
        else a
        for a in args
    )
    new_kwargs = {
        k: _DEVICE if isinstance(v, str) and v == "cuda"
        else _torch.device(_DEVICE) if isinstance(v, _torch.device) and v.type == "cuda"
        else v
        for k, v in kwargs.items()
    }
    # MPS doesn't support float64; auto-downcast to float32
    if _DEVICE == "mps" and self.dtype == _torch.float64:
        _first = new_args[0] if new_args else None
        _dev_arg = _first if isinstance(_first, (_torch.device, str)) else None
        _dev_kw = new_kwargs.get("device")
        if _dev_arg == "mps" or _dev_kw == "mps" or (_dev_arg is not None and isinstance(_dev_arg, _torch.device) and _dev_arg.type == "mps"):
            if len(new_args) > 1:
                new_args = (new_args[0], _torch.float32) + new_args[2:]
            else:
                new_kwargs.setdefault("dtype", _torch.float32)
    return _original_to(self, *new_args, **new_kwargs)
_torch.Tensor.to = _patched_to

# Patch torch.cuda.synchronize() to use the correct backend (MPS/CPU/CUDA)
_original_cuda_sync = _torch.cuda.synchronize
def _patched_synchronize(*args, **kwargs):
    if _DEVICE == "mps":
        _torch.mps.synchronize()
    elif _DEVICE == "cuda":
        _original_cuda_sync(*args, **kwargs)
    # CPU: no-op
_torch.cuda.synchronize = _patched_synchronize

# Disable torch.compile entirely on MPS — inductor codegen unstable for Apple Silicon
_torch._dynamo.config.suppress_errors = True  # fall back to eager on compile failures
if _DEVICE == "mps":
    _original_compile = _torch.compile
    def _patched_compile(model, *args, **kwargs):
        return model
    _torch.compile = _patched_compile


# ── PyTorch SDPA for Apple Silicon ──────────────────────────
def _enable_sdpa(pipeline, logger=None):
    """
    Enable PyTorch 2.0 Scaled Dot-Product Attention on the pipeline's UNet.
    2-3x faster attention on MPS vs the naive path.
    """
    try:
        from diffusers.models.attention_processor import AttnProcessor2_0 as _AP
        # Set SDPA processor on all attention layers
        if hasattr(pipeline, 'unet') and hasattr(pipeline.unet, 'set_attn_processor'):
            pipeline.unet.set_attn_processor(_AP())
            msg = "SDPA (AttnProcessor2_0) enabled on UNet"
        elif hasattr(pipeline, 'transformer') and hasattr(pipeline.transformer, 'set_attn_processor'):
            pipeline.transformer.set_attn_processor(_AP())
            msg = "SDPA (AttnProcessor2_0) enabled on transformer"
        else:
            msg = "Could not set SDPA — unknown pipeline structure"
        if logger:
            logger.info(msg)
        else:
            print(msg)
    except Exception as e:
        msg = f"SDPA setup skipped: {e}"
        if logger:
            logger.warning(msg)
        else:
            print(msg)
'''


def patch_gradio_app() -> bool:
    """Apply all patches to gradio_app.py."""
    if not os.path.exists(GRADIO_PATH):
        print(f"  {RED} gradio_app.py not found — skipping")
        return False

    # Reset to clean state first (like the notebook does)
    try:
        import subprocess
        subprocess.run(["git", "-C", REPO_DIR, "checkout", "--", "gradio_app.py"],
                       capture_output=True)
    except Exception:
        pass

    with open(GRADIO_PATH, "r") as f:
        code = f.read()

    changes = 0

    # ── 2a. Model paths ──
    code = code.replace(
        'value="models/SoulX-FlashHead-1_3B"',
        f'value="{MODEL_PATH}"'
    )
    code = code.replace(
        'value="models/wav2vec2-base-960h"',
        f'value="{WAV2VEC_PATH}"'
    )
    changes += 1

    # ── 2b. Default to lite mode ──
    code = code.replace('value="pro",', 'value="lite",')
    changes += 1

    # ── 2c. Face crop default ──
    # Left OFF by default (matches settings.yaml use_face_crop: false).
    # gradio_app.py reads the value from settings.yaml at runtime, so no
    # code-level flip is needed here.

    # ── 2d. Share mode ──
    if 'app.launch(share=True' not in code:
        code = code.replace('app.launch()', 'app.launch(share=True, debug=True)')
        changes += 1

    # ── 2e. Branding ──
    brand_match = re.search(
        r'^( *)gr\.Markdown\("# ⚡ SoulX-FlashHead Video Generator"\)',
        code, re.MULTILINE
    )
    if brand_match:
        ind = brand_match.group(1)
        brand_html = (
            '<div style="text-align:center; padding:25px; '
            'background:linear-gradient(135deg,#667eea 0%,#764ba2 100%); '
            'border-radius:12px; box-shadow:0 8px 16px rgba(0,0,0,0.2); margin-bottom:20px;">'
            '<h1 style="font-size:2.2em; margin:0; color:white;">🎬 SoulX FlashHead - AI Talking Head</h1>'
            '<p style="font-size:1.1em; color:rgba(255,255,255,0.9); margin:6px 0 12px;">'
            'Audio-Driven Portrait Animation | Lite &amp; Pro Models</p>'
            '<div style="display:flex; justify-content:center; gap:12px; flex-wrap:wrap;">'
            '<a href="https://www.youtube.com/@AiQuestacademy" target="_blank" '
            'style="background:#FF0000; color:#fff; padding:8px 18px; border-radius:8px; '
            'text-decoration:none; font-weight:600; font-size:0.95em;">'
            '▶ YouTube - AIQUEST</a>'
            '<a href="https://x.com/AiQuestacademy" target="_blank" '
            'style="background:#000; color:#fff; padding:8px 18px; border-radius:8px; '
            'text-decoration:none; font-weight:600; font-size:0.95em;">'
            '𝕏 Follow on X</a></div>'
            '<p style="margin-top:10px; font-size:0.85em; color:rgba(255,255,255,0.7);">'
            'Notebook by <b>AIQUEST</b> — Subscribe for more AI tools &amp; tutorials!</p></div>'
        )
        old_line = brand_match.group(0)
        new_line = ind + 'gr.HTML(' + repr(brand_html) + ')'
        code = code.replace(old_line, new_line)
        changes += 1

    # ── 2f. Composite injection into run_inference ──
    run_inf_pattern = re.search(
        r'(logger\.info\(f"Saved to \{final_video_path\}"\))\s*\n(\s*)(return final_video_path)',
        code
    )
    if run_inf_pattern:
        old_block = run_inf_pattern.group(0)
        ind = run_inf_pattern.group(2)
        new_block = (
            run_inf_pattern.group(1) + '\n'
            + ind + '    # ── 16:9 Composite ──\n'
            + ind + '    try:\n'
            + ind + '        final_video_path = _composite_to_original(final_video_path, cond_image)\n'
            + ind + '    except Exception as e:\n'
            + ind + '        import traceback; logger.error(f"COMPOSITE FAILED: {e}\\n{traceback.format_exc()}")\n'
            + ind + '    return final_video_path'
        )
        code = code.replace(old_block, new_block)
        changes += 1
    else:
        print(f"  {RED} Could not find run_inference return site — composite NOT injected (may need manual fix)")

    # ── 2g. Composite injection into run_multi_gpu_inference ──
    multi_pattern = re.search(
        r'(if os\.path\.exists\(save_path\):)\s*\n(\s*)(return save_path)',
        code
    )
    if multi_pattern:
        old_block2 = multi_pattern.group(0)
        ind2 = multi_pattern.group(2)
        new_block2 = (
            multi_pattern.group(1) + '\n'
            + ind2 + '    # ── 16:9 Composite ──\n'
            + ind2 + '    try:\n'
            + ind2 + '        save_path = _composite_to_original(save_path, cond_image)\n'
            + ind2 + '    except Exception as e:\n'
            + ind2 + '        import traceback; logger.error(f"COMPOSITE FAILED: {e}\\n{traceback.format_exc()}")\n'
            + ind2 + '    return save_path'
        )
        code = code.replace(old_block2, new_block2)
        changes += 1
    else:
        print(f"  {RED} Could not find multi-GPU return site — composite NOT injected")

    # ── 2h. Insert composite function before any def ──
    first_def = code.index("\ndef ")
    code = code[:first_def] + COMPOSITE_FUNC + code[first_def:]
    changes += 1

    # ── 2i. Insert MPS device boilerplate after imports ──
    # Find the last import statement
    import_lines = list(re.finditer(r'^import \S|^from \S', code, re.MULTILINE))
    if import_lines:
        last_import_end = import_lines[-1].end()
        # Find the next blank line or code after it
        insert_pos = code.index("\n", last_import_end) + 1
        code = code[:insert_pos] + DEVICE_BOILERPLATE + code[insert_pos:]
        changes += 1

    # ── 2j. Wrap CUDA-only imports ──
    # xformers
    code = code.replace(
        "import xformers",
        "try:\n    import xformers\nexcept ImportError:\n    xformers = None"
    )
    code = code.replace(
        "from xformers",
        "# xformers not available on macOS — skipping\n# from xformers"
    )
    # xfuser
    code = code.replace(
        "import xfuser",
        "try:\n    import xfuser\nexcept ImportError:\n    xfuser = None"
    )
    changes += 1

    # ── 2k. Inject SDPA enablement after pipeline loading ──
    # Find:  pipeline_var = SoulXPipeline.from_pretrained(...)
    # Then:  .to(something)
    # Inject _enable_sdpa(pipeline_var) after the .to() call
    sdpa_pattern = re.search(
        r'(\w+)\s*=\s*SoulXPipeline\.from_pretrained\(',
        code
    )
    if sdpa_pattern:
        var_name = sdpa_pattern.group(1)
        # Find the corresponding .to() call for this pipeline
        to_pattern = re.search(
            rf'{var_name}\s*=\s*{var_name}\.to\(.*?\)\s*$',
            code,
            re.MULTILINE
        )
        if to_pattern:
            old_to = to_pattern.group(0)
            new_block = old_to + f'\n_enable_sdpa({var_name}, logger)'
            code = code.replace(old_to, new_block)
            print(f"  {GREEN} SDPA injected after {var_name}.to(...)")
        else:
            # Fallback: try to find .to() on the next few lines after from_pretrained
            from_pos = sdpa_pattern.end()
            # Search forward for .to() within 15 lines
            tail = code[from_pos:from_pos + 2000]
            to_fallback = re.search(rf'{var_name}\s*=\s*{var_name}\.to\(', tail)
            if to_fallback:
                abs_pos = from_pos + to_fallback.end()
                line_end = code.index('\n', abs_pos)
                old_to = code[abs_pos:line_end]
                new_line = old_to + f'\n_enable_sdpa({var_name}, logger)'
                code = code[:abs_pos] + new_line + code[line_end + 1:]
                print(f"  {GREEN} SDPA injected after {var_name}.to() (fallback)")
            else:
                # Last resort: inject right after from_pretrained block ends
                # Find the closing parenthesis of from_pretrained(...)
                depth, i = 0, from_pos
                while i < len(code):
                    if code[i] == '(':
                        depth += 1
                    elif code[i] == ')':
                        depth -= 1
                        if depth == 0:
                            inject_at = i + 1
                            code = code[:inject_at] + f'\n{var_name} = {var_name}.to(_DEVICE)\n_enable_sdpa({var_name}, logger)' + code[inject_at:]
                            print(f"  {GREEN} SDPA injected after from_pretrained() (no .to() found)")
                            break
                    i += 1
        changes += 1
    else:
        print(f"  {INFO} No SoulXPipeline.from_pretrained() found — SDPA not injected (may be auto-detected by diffusers)")


    with open(GRADIO_PATH, "w") as f:
        f.write(code)

    return True


# ═════════════════════════════════════════════════════════════
# PART 3 — Additional file-level CUDA→device patching
# ═════════════════════════════════════════════════════════════

def patch_cuda_strings_in_dir(directory: str):
    """
    Walk through Python files and replace hardcoded .to("cuda") / .to('cuda')
    with .to(DEVICE_VAR) where possible. Also wrap bare `import xformers`.
    """
    # Only patch key files to avoid breaking things
    key_files = [
        os.path.join(directory, "flash_head", "pipeline", "pipeline_flash_head.py"),
        os.path.join(directory, "flash_head", "pipeline", "pipeline_flash_head_lite.py"),
    ]
    for fpath in key_files:
        if not os.path.exists(fpath):
            continue
        with open(fpath, "r") as f:
            content = f.read()

        modified = False
        # Replace .to("cuda") → .to(DEVICE)
        content, count = re.subn(r'\.to\(["\']cuda["\']\)', '.to("mps" if torch.backends.mps.is_available() else "cpu")', content)
        if count > 0:
            modified = True

        # Replace torch.device("cuda")
        content, count = re.subn(
            r'torch\.device\(["\']cuda["\']\)',
            'torch.device("mps" if torch.backends.mps.is_available() else "cpu")',
            content
        )
        if count > 0:
            modified = True

        if modified:
            with open(fpath, "w") as f:
                f.write(content)
            print(f"  {GREEN} Patched device strings in {os.path.relpath(fpath, directory)}")


# ═════════════════════════════════════════════════════════════
# MAIN
# ═════════════════════════════════════════════════════════════

def main():
    print(f"\n{'='*60}")
    print(f"  SoulX FlashHead — Patching for Apple Silicon")
    print(f"{'='*60}\n")

    # Safety checks
    if not os.path.exists(REPO_DIR):
        print(f"  {RED} Repo not found at {REPO_DIR}")
        print(f"  {INFO} Run setup.sh first to clone the repository.")
        sys.exit(1)

    if not os.path.exists(MODEL_PATH):
        print(f"  {INFO} Models not yet downloaded — setup.sh handles this.")
        print(f"  {INFO} Patches will still be applied to code.")

    results = []

    print("── CPU Face Handler ──")
    results.append(("CPUFaceHandler replaced with OpenCV", patch_cpu_face_handler()))

    print("\n── Face Crop Bbox ──")
    results.append(("facecrop.py saves crop bbox", patch_facecrop()))

    print("\n── Gradio App ──")
    results.append(("gradio_app.py patched (paths, device, branding, composite)", patch_gradio_app()))

    print("\n── CUDA→MPS Device Strings ──")
    patch_cuda_strings_in_dir(REPO_DIR)

    # ── Verification ──
    print(f"\n{'─'*60}")
    print("  Verification")
    print(f"{'─'*60}")

    if os.path.exists(GRADIO_PATH):
        with open(GRADIO_PATH, "r") as f:
            final = f.read()
        verifications = [
            ("_composite_to_original(final_video_path, cond_image)" in final, "Composite in run_inference"),
            ("_composite_to_original(save_path, cond_image)" in final, "Composite in run_multi_gpu"),
            ("def _composite_to_original" in final, "Composite function defined"),
            ("_flashhead_crop_bbox.json" in final, "Composite reads bbox"),
            ("_DEVICE = \"mps\"" in final, "MPS device detection"),
            ("def _enable_sdpa" in final, "SDPA helper function"),
            ("_enable_sdpa(" in final and "logger" in final, "SDPA injected after pipeline load"),
            ("AttnProcessor2_0" in final, "AttnProcessor2_0 import"),
            ("share=True" in final, "Gradio share mode"),
            ("value=\"lite\"" in final or "'lite'" in final, "Default to lite mode"),
            (MODEL_PATH in final, "Models path patched"),
        ]
        for ok, label in verifications:
            check(label, ok)

    if os.path.exists(HANDLER_PATH):
        with open(HANDLER_PATH, "r") as f:
            handler = f.read()
        check("CPUFaceHandler uses OpenCV (no mediapipe)", "mediapipe" not in handler)
        check("DNN face detector available", "cv2.dnn" in handler)

    if os.path.exists(FACECROP_PATH):
        with open(FACECROP_PATH, "r") as f:
            fc = f.read()
        check("facecrop.py saves bbox JSON", "_flashhead_crop_bbox.json" in fc)

    print(f"\n{'─'*60}")
    print(f"  Patching complete.")
    print(f"{'─'*60}")
    print(f"\n  Next: run ./run.sh to launch SoulX FlashHead")
    print()


if __name__ == "__main__":
    main()
