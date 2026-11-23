# 🎬 SoulX FlashHead — Apple Silicon Edition

**Audio-Driven Talking Head Generator** — adapted from the [SoulX-FlashHead](https://github.com/Soul-AILab/SoulX-FlashHead) Colab notebook by AIQUEST, optimized for **Apple Silicon (M5 / M4 / M3 / M2 / M1) Macs** using the **MPS (Metal Performance Shaders)** backend.

> ⚠️ No CUDA required. Runs entirely on the Apple Neural Engine / Metal GPU via PyTorch MPS.

---

## 📦 What's Included

| What | Description |
|------|-------------|
| **Lite & Pro models** | Choose between fast Lite or high-quality Pro mode |
| **Audio-driven** | Upload a face photo + speech audio → talking head video |
| **Gradio Web UI** | Browser interface with public share link |
| **16:9 output** | Auto-composites the generated face crop back onto the original image |
| OpenCV face detection | No broken mediapipe dependency — uses OpenCV DNN with Haar fallback |
| **PyTorch SDPA** | **AttnProcessor2_0 enabled** — 2–3x faster attention on MPS via Metal Performance Shaders |

## 📁 Project Structure

```
soulx-flashhead-local/
├── setup.sh              # One-time setup (install deps, download models)
├── run.sh                # Launch the Gradio UI
├── requirements.txt      # Python dependencies (no CUDA-only packages)
├── settings.yaml         # Runtime configuration
├── README.md             # This file
├── flash_head/           # Core Python package
│   ├── audio_analysis/   # Audio processing (wav2vec2)
│   ├── configs/          # Inference parameters
│   ├── ltx_video/        # LTX video models
│   ├── src/              # Pipeline, modules, distributed
│   ├── utils/            # Face detection, cropping, utilities
│   └── wan/              # WAN VAE modules
├── gradio_app.py         # Main Gradio web UI
├── gradio_app_streaming.py  # Streaming variant
├── generate_video.py     # CLI inference script
├── models/               # Downloaded model weights (after setup)
│   ├── SoulX-FlashHead-1_3B/
│   └── wav2vec2-base-960h/
└── .venv/                # Python virtual environment (after setup)
```

---

## 🚀 Setup (one-time)

### Prerequisites

- **macOS** on Apple Silicon (M1–M5)
- **Python 3.11+** — [python.org](https://www.python.org/downloads/) or `brew install python`
- **Homebrew** — `/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"`
- **Git** — `xcode-select --install` or `brew install git`
- **~8 GB free disk space** (models + dependencies)

### Run the setup script

```bash
cd ~/codingprojects/soulx-flashhead-local   # or wherever you put it
chmod +x setup.sh
./setup.sh
```

The script will:

1. ✅ Install `ffmpeg` via Homebrew (if missing)
2. ✅ Create a Python virtual environment
3. ✅ Install all dependencies (PyTorch with MPS support, no CUDA packages)
4. ✅ Download model weights (~2.6 GB: FlashHead 1.3B + wav2vec2)

> **Note:** The Gradio checkbox for *Use Face Crop* defaults to **ON** in code, but the
> [`settings.yaml`](settings.yaml) overrides it to **OFF** at runtime
> (`use_face_crop: false`). On Apple Silicon the OpenCV Haar-cascade fallback is used
> (the DNN/Caffe detector is unavailable in OpenCV 5.x), which is slower — leaving it
> OFF skips a costly detection step. Set `use_face_crop: true` in `settings.yaml` to enable.

---

## ▶️ Usage

After setup completes:

```bash
./run.sh
```

This opens a Gradio interface at **http://127.0.0.1:7860** and generates a public shareable URL.

1. **Upload a portrait photo** (face should be clearly visible)
2. **Upload or record audio** (speech, not music)
3. Click **Generate**
4. Download the resulting talking-head video

---

## 🔧 How It Works

### From Colab → Local

The original notebook was designed for Google Colab (CUDA, `/content/` paths, Colab-specific cells). This adaptation:

| Colab Original | Apple Silicon Adaptation |
|----------------|-------------------------|
| `torch.cuda.is_available()` | MPS + CUDA + CPU auto-detect |
| `xformers` / `xfuser` / `distvae` | Skipped (CUDA-only, not needed on Mac) |
| `!/content/...` paths | Local project paths |
| Colab branding | AIQUEST branding with share link |
| Mediapipe face handler | OpenCV DNN face detection |
| Square crop output | 16:9 composite onto original image |
| Colab T4 GPU | MPS (Metal) GPU acceleration |

### Device Selection

The patched `gradio_app.py` automatically selects the best available device:

```
MPS  → Apple Silicon GPU (Metal Performance Shaders)
CUDA → NVIDIA GPU (if available, e.g. eGPU)
CPU  → Fallback (slow but works)
```

---

## ⚙️ Configuration (`settings.yaml`)

The `settings.yaml` file overrides runtime defaults (it is read
by `gradio_app.py`). Useful keys:

| Key | Default | Meaning |
|-----|---------|---------|
| `use_face_crop` | `false` | Crop tightly around the detected face. ON uses OpenCV Haar-cascade (slow on MPS); OFF uses the full image. |
| `face_ratio` | `4.0` | Context around the face when cropping (2.0 = headshot, 4.0 = upper body). Only used when `use_face_crop: true`. |
| `audio_encode_mode` | `stream` | `stream` (chunk-by-chunk) or `once` (all at once). |
| `seed` | `9999` | Default **Random Seed** shown in the Gradio UI. Same seed + same inputs = identical output. |

> The **Random Seed** input box in the web UI seeds PyTorch's `torch.Generator`, which
> drives the initial noise of the diffusion process. Set it to a fixed value for
> reproducible videos.

---

## 📌 Notes & Version Compatibility

- **Gradio 6.0+** is required. The original upstream code passes `theme=` to
  `gr.Blocks(...)`, which was moved to `app.launch(theme=...)` in Gradio 6.0 — this
  port already applies that fix. Installing `gradio==5.x` will raise a `UserWarning`
  and may mis-render the UI.
- **No CUDA packages** are needed or installed. `flash-attn`, `sageattention`, and
  `xfuser` are CUDA-only and are safely skipped/stubbed on Apple Silicon; MPS uses
  PyTorch's built-in SDPA attention.

---

| Problem | Likely Fix |
|---------|------------|
| `torch.backends.mps.is_available()` returns `False` | Use macOS 12.3+ and PyTorch ≥2.0. Check `python -c "import torch; print(torch.backends.mps.is_available())"` |
| "decord not found" | `pip install decord` or `brew install decord` |
| "ffmpeg not found" | `brew install ffmpeg` |
| Out of memory | Close other apps. The 1.3B model needs ~4–6 GB RAM on Mac |
| Slow inference | This is expected on MPS vs CUDA T4. Lite mode is faster. |
| Gradio share link not working | Check firewall. Use local `http://127.0.0.1:7860` instead |

---

## 📚 Credits

- **Original model:** [Soul-AILab/SoulX-FlashHead](https://github.com/Soul-AILab/SoulX-FlashHead)
- **Colab notebook:** [AIQUEST Academy](https://youtube.com/@AiQuestacademy)
- **Apple Silicon adaptation:** Community port — no affiliation with Soul-AILab or AIQUEST

---

## 📄 License

The original SoulX-FlashHead model and code are provided under their respective licenses by Soul-AILab. This adaptation is for personal/educational use.
