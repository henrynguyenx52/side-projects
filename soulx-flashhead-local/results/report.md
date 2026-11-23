# SoulX-FlashHead Lite — Local Benchmark Report

**Date:** 2026-11-21  
**Target Hardware:** Mac mini M4 (24 GB Unified Memory, macOS arm64)  
**Framework:** PyTorch 2.15.0 with Metal Performance Shaders (`mps`)  
**Input:** Portrait image (571x1024, centered 512x512) + Vietnamese speech WAV (10.0s, 16 kHz mono)  

---

## 1. Executive Summary & Acceptance Gate Decision

| Metric | Target (Gate) | Measured (M4 MPS) | Status |
| :--- | :--- | :--- | :--- |
| **Pure Inference Time (10s audio)** | < 10.0s | **93.79s** | **FAILED** |
| **Real-Time Factor (RTF)** | < 1.0 | **9.38** (end-to-end 9.72) | **FAILED** |
| **Effective Generation Speed** | ≥ 10.0 FPS | **2.67 FPS** | **FAILED** |
| **Output Frames / Duration** | 250 frames / 10s | 250 frames / 10.0s | **PASSED** |
| **Visual Photorealism & Sync** | Natural motion, lip sync | Good identity, synchronized lips | **PASSED** |
| **Memory Stability (24 GB)** | Stable, no OOM | Peak ~9.8 GB, stable | **PASSED** |

### Decision: **NO-GO for Real-Time / Streaming Integration**
SoulX-FlashHead Lite runs locally without errors on Apple Silicon MPS and produces high-quality photorealistic video with natural Vietnamese lip synchronization. However, at **RTF = 9.38** (93.79 seconds of inference for 10 seconds of output), it is **almost 2x slower than the previous Ditto baseline (RTF = 5.0, 50s)** and **~9.4x away from real-time streaming (RTF < 1.0)**.

---

## 2. Timing & Profiling Breakdown

Each 10-second run at 25 FPS processes 11 chunks (each producing 24 frames = 0.96s audio/video after chunk 0).

| Pipeline Stage | Time per chunk | % of chunk time | Cumulative (11 chunks) |
| :--- | :--- | :--- | :--- |
| **DiT Denoising (4 steps)** | ~5.12s (1.28s / step) | 60.1% | ~56.3s |
| **LTX VAE Decode (33 frames)** | ~2.48s | 29.1% | ~27.3s |
| **LTX VAE Encode (motion frames)** | ~0.69s | 8.1% | ~7.6s |
| **Color Correction** | ~0.15s | 1.8% | ~1.7s |
| **Audio Feature Extraction (wav2vec2)** | ~0.08s | 0.9% | ~0.9s |
| **Total per chunk / Total inference** | **~8.52s** | **100%** | **93.79s** |

---

## 3. Bottleneck Analysis

1. **DiT Diffusion Step Latency (60% of time):**
   - Each single denoise step takes ~1.28 seconds on M4 MPS. Even with distillation down to only 4 steps, 4 steps require > 5.1 seconds.
   - For real-time (0.96s per chunk), each denoise step would need to complete in under 0.15 seconds (an 8.5x speedup).
2. **LTX VAE Video Decoding (29% of time):**
   - Decoding 33 frames of 512x512 video through 3D causal convolutions takes 2.48 seconds per chunk.
   - Even if the DiT step time were zero, VAE decode alone (2.48s) gives RTF = 2.58 (> 1.0).
3. **Hardware Limitations:**
   - The upstream "96 FPS / RTF < 0.2" claim is achieved on an **NVIDIA RTX 4090 (24 GB, 82.6 TFLOPS FP16/BF16, 1,008 GB/s bandwidth)** with FlashAttention-2 and CUDA Tensor Cores.
   - The Apple M4 GPU delivers ~4 TFLOPS and 120 GB/s bandwidth without native flash-attention or torch inductor compilation on MPS.

---

## 4. Fixes & Patches Applied

1. **`flash_head/audio_analysis/wav2vec2.py`**:
   - Patched `Wav2Vec2Model.forward` to preserve all 12 layer hidden states when running with newer `transformers`, resolving the `TypeError: 'NoneType' object is not subscriptable` crash.
2. **`flash_head/ltx_video/models`**:
   - Restored missing causal video autoencoder source files from upstream repository into the flattened project structure.
3. **`flash_head/src/pipeline/flash_head_pipeline.py` & `generate_video.py`**:
   - Synchronized MPS device calls via `torch.mps.synchronize()` instead of CUDA synchronization.
   - Bound local Gradio server strictly to `127.0.0.1`.
