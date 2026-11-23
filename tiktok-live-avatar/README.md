# TikTok Live Avatar

Pipeline thử nghiệm:

1. VieNeu-TTS chạy trên máy local và phát PCM/WAV tiếng Việt.
2. Ditto TalkingHead chạy trên GPU Vast.ai, đăng ký avatar một lần và nhận audio theo chunk.
3. FFmpeg ghép audio/video 25 fps và đẩy tới TikTok RTMP.

## Trạng thái

- Ditto PyTorch checkpoint đã chạy thành công trên RTX 5070 Ti.
- `remote/ditto_online_smoke.py` chạy HuBERT online với pre-roll 70 frame để không mất đầu câu.
- Test VieNeu 48 kHz → Ditto đạt 25 fps, giữ nguyên audio 48 kHz và đúng thời lượng 7,2 giây.
- Clip kiểm thử: `output/vieneu-ditto-test.mp4`.

### Benchmark livestream 10 giây

Trên RTX 5070 Ti, checkpoint PyTorch, `sampling_timesteps=20`, `max_size=768`:

- 250 frame đầu ra, đúng 10 giây ở 25 fps.
- Ditto sinh 260 frame trong 9,67 giây, trung bình 26,89 fps tính cả warm-up.
- Sau warm-up giữ khoảng 30–34 fps.
- Cold start toàn process là 15,58 giây; service thật phải giữ model và avatar trong RAM.
- Clip: `output/vieneu-ditto-10s-steps20-768.mp4`.

Cấu hình này vượt realtime trong test ngắn. Trước khi phát thật cần soak test dài hơn
với publisher RTMP/NVENC để kiểm tra buffer, đồng bộ A/V và reconnect.

## Dữ liệu cần để phát TikTok thật

- Một ảnh hoặc video avatar nhìn thẳng, mặt rõ, không bị che.
- TikTok RTMP server URL và stream key (tài khoản phải có quyền dùng streaming software).
- Giọng VieNeu muốn dùng; mặc định hiện tại có thể dùng `Adam bựa`.

Không commit stream key vào Git. Khi thêm publisher, key sẽ chỉ được đọc từ biến môi trường
`TIKTOK_RTMP_URL` trên phiên chạy.

Tạo cấu hình riêng:

```bash
cp .env.example .env
```

Sau đó điền `TIKTOK_RTMP_URL` và `AVATAR_PATH` trong `.env`.

## Smoke test trên Vast.ai

```bash
source /venv/main/bin/activate
python /workspace/tiktok-live-avatar/remote/ditto_online_smoke.py \
  --ditto-root /workspace/ditto-talkinghead \
  --data-root /workspace/ditto-talkinghead/checkpoints/ditto_pytorch \
  --cfg-pkl /workspace/ditto-talkinghead/checkpoints/ditto_cfg/v0.4_hubert_cfg_pytorch.pkl \
  --audio /workspace/ditto-talkinghead/example/audio.wav \
  --source /workspace/ditto-talkinghead/example/image.png \
  --output /workspace/ditto-talkinghead/tmp/result-online.mp4
```
