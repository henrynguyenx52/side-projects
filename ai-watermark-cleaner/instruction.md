# Hướng dẫn sử dụng `remove-ai-watermarks` cho Video (Windows 24GB VRAM & Mac)

* **Repo gốc:** https://github.com/wiltodelta/remove-ai-watermarks

Tài liệu này tổng hợp cấu hình đã kiểm chứng thực tế trên video xuất từ **RunningHub** để phá watermark ẩn trong pixel (vượt kiểm duyệt nhãn AIGC của TikTok).

---

## 1. Cài đặt trên máy Windows (NVIDIA GPU 24GB VRAM)

Yêu cầu: Card NVIDIA kiến trúc Ampere trở lên (RTX 3090 / 4090 / 5090, hỗ trợ `bf16`) và đã cài NVIDIA Driver mới. Không cần tự cài Python hay FFmpeg trước.

Mở **PowerShell** và chạy:

```powershell
# 1. Cài uv
winget install --id=astral-sh.uv -e

# Mở lại PowerShell sau khi cài uv, rồi cài tool kèm PyTorch CUDA tự động:
uv tool install --python 3.12 --torch-backend=auto "remove-ai-watermarks[video,diffusion]"
```

Kiểm tra cài đặt thành công:

```powershell
remove-ai-watermarks --help
```

---

## 2. Model sử dụng (Tự động tải ở lần chạy đầu)

**Không cần tải tay**, ở lần chạy đầu tiên tool tự tải model public từ Hugging Face:

* **2D VAE (`--profile synthid`):** `stabilityai/sd-vae-ft-mse` (~335 MB).
* **3D Diffusion (`--profile auto` trên GPU >= 16GB VRAM):** `Wan-AI/Wan2.1-T2V-1.3B-Diffusers` (vài GB).

---

## 3. Các lệnh chạy khuyên dùng trên Windows (24GB VRAM)

### Cách A — 2D VAE giữ độ phân giải gốc (Nhanh: ~1–2 phút, khuyên thử trước)

Giữ nguyên độ phân giải gốc (1080p/1920px) và giữ nguyên FPS gốc (`--keep-fps`), tránh bị mờ như chế độ `512p` (`--native-guide`):

```powershell
remove-ai-watermarks video invisible input.mp4 --profile synthid --long-side 1920 --keep-fps -o clean.mp4
```

* **Muốn nét hơn nữa:** giảm dần `--noise-std` từ mặc định `0.15` xuống `0.12` hoặc `0.10` (rồi test lại trên TikTok để tìm ngưỡng vừa nét nhất vừa không dính AIGC):

```powershell
remove-ai-watermarks video invisible input.mp4 --profile synthid --long-side 1920 --noise-std 0.12 --keep-fps -o clean.mp4
```

### Cách B — 3D `Wan 2.1` (Chất lượng/chi tiết tự nhiên hơn, chậm hơn)

Trên GPU >= 16GB VRAM, `--profile auto` tự chọn `Wan 2.1` ở độ phân giải gốc:

```powershell
# Chạy nhanh với 8 bước denoising
remove-ai-watermarks video invisible input.mp4 --keep-fps --wan-steps 8 -o clean.mp4

# Hoặc chạy đủ 20 bước mặc định (chất lượng cao nhất)
remove-ai-watermarks video invisible input.mp4 --keep-fps -o clean.mp4
```

### Xử lý hàng loạt nhiều video trong thư mục (PowerShell)

```powershell
mkdir output
Get-ChildItem *.mp4 | ForEach-Object {
    remove-ai-watermarks video invisible $_.FullName --profile synthid --long-side 1920 --keep-fps -o "output\$($_.BaseName)_clean.mp4"
}
```

---

## 4. Ghi chú riêng cho máy Mac (Apple Silicon M4)

* Trên Mac hiện tại, toàn bộ môi trường test đang nằm gọn trong thư mục `ai-watermark-cleaner/` (bao gồm `.venv/` và `.cache/`).
* Chạy bằng wrapper script có sẵn:

```bash
./run.sh video invisible /path/to/input.mp4 --device mps --long-side 1024 --no-temporal-stabilize --keep-fps -o output/clean.mp4
```

* *(Lưu ý: Không dùng `--native-guide` nếu không muốn bị mờ mặt; không dùng `--low-memory` trên máy 24GB RAM vì sẽ làm chậm nhiều lần).*

---

## 5. Dọn dẹp sạch sẽ

### Trên máy Mac (xoá toàn bộ môi trường + model cache + output):

```bash
rm -rf /Users/hungnguyen/Documents/side-projects/ai-watermark-cleaner
# Tuỳ chọn: xoá thêm cache wheel của uv
uv cache clean
```

### Trên máy Windows (nếu muốn gỡ sau này):

```powershell
uv tool uninstall remove-ai-watermarks
# Model Hugging Face nằm mặc định trong %USERPROFILE%\.cache\huggingface
```
