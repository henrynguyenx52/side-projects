# SoulX-FlashHead Lite on Apple Silicon (Mac M4)

This workspace contains the local port and benchmark harness for **SoulX-FlashHead Lite** running on Apple Silicon via PyTorch Metal Performance Shaders (`mps`).

## Hardware & Environment
- **Platform:** Mac mini M4, 24 GB Unified Memory, macOS arm64
- **PyTorch:** 2.15.0 (MPS Metal acceleration)
- **Model Checkpoints:**
  - `models/SoulX-FlashHead-1_3B` (Lite mode + LTX VAE)
  - `models/wav2vec2-base-960h`

---

## Benchmark Results (10s Benchmark Gate)

Target from `implementation.md`: **RTF < 1.0** (< 10 seconds pure inference for 10s audio, ≥ 10 FPS).

| Metric | Measured Value | Acceptance Gate |
| :--- | :--- | :--- |
| **Pure Inference Time** | **93.79s** (for 10s audio) | **FAILED** (Target < 10.0s) |
| **Real-Time Factor (RTF)** | **9.38** (end-to-end 9.72) | **FAILED** (Target < 1.0) |
| **Generation Throughput** | **2.67 FPS** | **FAILED** (Target ≥ 10.0 FPS) |
| **Output Frames** | 250 frames @ 25 FPS (10.0s) | **PASSED** |
| **Memory Footprint** | Peak ~9.8 GB (stable on 24 GB) | **PASSED** |

### Decision: **NO-GO for Real-Time Streaming**
While visual fidelity and Vietnamese lip synchronization are high-quality, inference throughput on base M4 MPS is **2.67 FPS (RTF = 9.38)**. This is ~9.4x away from real-time and almost 2x slower than the previous Ditto baseline (RTF = 5.0).

Detailed profiling report: [results/report.md](/Users/hungnguyen/Documents/side-projects/soulx-flashhead-local/results/report.md:1)  
Benchmark data: [results/benchmark.json](/Users/hungnguyen/Documents/side-projects/soulx-flashhead-local/results/benchmark.json:1)

---

## How to Run Inference

### 1. Activate Environment
```bash
cd /Users/hungnguyen/Documents/side-projects/soulx-flashhead-local/repo
source ../.venv/bin/activate
```

### 2. Generate Video CLI
```bash
python generate_video.py \
    --ckpt_dir models/SoulX-FlashHead-1_3B \
    --wav2vec_dir models/wav2vec2-base-960h \
    --model_type lite \
    --cond_image ../test_portrait.jpg \
    --audio_path ../test_speech_10s.wav \
    --save_file ../test_output_10s.mp4
```

### 3. Local Gradio Web UI
```bash
python gradio_app.py
```
Open `http://127.0.0.1:7860` in your local browser (public sharing is disabled for security).
