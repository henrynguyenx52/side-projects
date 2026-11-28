# GPU Cloud Runner

Local web app để gửi image/video reference lên GPU cloud qua native OpenSSH, chạy command model và tự tải output về máy local. Nếu Cloudflare WARP đang bật, `ssh`/`scp` tự đi theo system route của WARP.

## Chạy app

Yêu cầu Node.js 20+.

```bash
npm install
npm start
```

Mở <http://127.0.0.1:4173>.

Trên macOS cũng có thể double-click `start.command` sau lần `npm install` đầu tiên.

## Cách dùng

1. Paste nguyên lệnh direct SSH hiện tại, ví dụ `ssh -p 22 -i ~/.ssh/id_ed25519 root@DIRECT_IP`.
2. Chọn ảnh hoặc video reference.
3. Nhập thư mục job trên remote và command chạy model.
4. Bấm **Run on cloud GPU**. App dùng native `scp` để upload, native `ssh` để stream log, rồi native `scp -r` tải toàn bộ `{output_dir}` vào `outputs/<job-id>`.

Có thể bật **Xoá watermark AIGC sau khi chạy** để thêm bước hậu xử lý cho các MP4 trong output bằng worker Wan 2.1 tối ưu (`8` steps, `BF16 + TF32`, tải song song 8 luồng + bỏ qua UMT5-XXL khi đã cache prompt). Worker dùng `ffprobe` để đọc kích thước/FPS gốc, giới hạn tối đa `30 fps`, chạy Wan ở tối đa `720p` (`193` frame/chunk) kèm log tiến độ từng step rồi dùng FFmpeg (NVENC/x264) upscale Lanczos về lại độ phân giải gốc và xoá sạch metadata; file gốc vẫn được giữ lại.

Để xử lý video có sẵn bằng 2D VAE, chọn preset **Chỉ xoá watermark AIGC · SynthID**. Chọn từ 1 đến 10 video MP4, MOV hoặc M4V rồi bấm **Run on cloud GPU**. Preset chạy `remove-ai-watermarks==0.75.0` profile `synthid` (`--long-side 1920`) trên CUDA và tải các bản đã xử lý về Local outputs.

Preset **Chỉ xoá watermark AIGC · Wan 2.1 (8 steps)** chạy thẳng pipeline Wan 2.1 tối ưu trên GPU NVIDIA hỗ trợ CUDA và BF16: tải model song song với `hf_transfer`, encode prompt trên GPU và lưu cache cho các lần sau, stream FFmpeg pipe không tạo file trung gian và hiển thị tiến độ chi tiết từng chunk/step. Kết quả nằm trong `aigc-cleaned/` ở Local outputs.

## WARP + direct SSH

- App parse direct host/port/key từ command SSH; `-L`, `-R`, `-D` không được mang sang các process job.
- Toàn bộ network dùng `/usr/bin/ssh` và `/usr/bin/scp` của hệ điều hành, nên WARP áp dụng tự động ở tầng route.
- Transfer tắt SSH compression vì image/video đã nén sẵn, bật `IPQoS=throughput`, keepalive và connection timeout.
- Log hoàn tất hiển thị tổng MB, số giây và tốc độ MB/s.
- Không còn dependency hoặc fallback qua `ssh2`/SFTP JavaScript.

## Preset Robust Video Matting

Preset mặc định dùng official RVM MobileNetV3 qua Torch Hub. Chọn một hoặc nhiều video rồi chạy; app tự upload `remote/rvm_runner.py` và trả về ba file cho mỗi input:

- `*_green.mp4`: preview người trên nền xanh.
- `*_foreground.mp4`: foreground RGB.
- `*_alpha.mp4`: alpha matte dạng grayscale.

Cloud image cần có Python 3, CUDA, PyTorch và Torchvision tương thích GPU. Preset ưu tiên Python tại `/venv/main` trên Vast.ai rồi fallback sang `python3`, đồng thời tự cài các dependency video nhẹ (`av`, `pims`, `tqdm`, `pillow`). Lần chạy đầu cần Internet để Torch Hub tải source và official MobileNetV3 weights; các lần sau dùng cache.

Các placeholder hỗ trợ:

| Placeholder | Giá trị khi chạy |
| --- | --- |
| `{input_dir}` | Thư mục chứa tất cả reference trên remote |
| `{output_dir}` | Thư mục remote mà model phải ghi kết quả vào |
| `{images}` | Danh sách path ảnh, đã shell-quote |
| `{videos}` | Danh sách path video, đã shell-quote |
| `{prompt}` | Prompt, đã shell-quote |
| `{runner}` | Worker script được app upload cho preset tích hợp |
| `{workflow}` | Workflow JSON được app upload cho preset SCAIL2 |

Ví dụ:

```bash
python /opt/my-model/infer.py \
  --images {images} \
  --videos {videos} \
  --prompt {prompt} \
  --output {output_dir}
```

## Preset cài SCAIL2 v4.6

Chọn **Máy yếu (FP8) · chỉ cài setup** để GPU tự nhận file `22_v4.6_full_15s_fast_low_memory.json` ở thư mục cha của app. Preset không cần chọn ảnh/video. Nó sẽ:

- kiểm tra SageAttention ngay đầu setup. Runner dùng bản đang cài nếu kernel chạy được, hoặc tìm wheel Linux x86_64 của PixelOven khớp Python, PyTorch, CUDA và GPU, xác thực SHA-256 rồi test kernel. Nếu bước này lỗi, job dừng trước khi cài ComfyUI hay tải model;
- cài ComfyUI tại `/workspace/ComfyUI` nếu chưa có;
- cài custom nodes SCAIL2 Easy, KJNodes, VideoHelperSuite, ComfyUI Essentials và ComfyLiterals;
- kiểm tra lại kernel SageAttention nếu vừa cài các phụ thuộc;
- đọc workflow và tải bảy model từ Hugging Face vào `models/checkpoints`, `diffusion_models`, `text_encoders`, `clip_vision`, `loras` và `vae`; checkpoint diffusion FP16 trong workflow được tự thay bằng bản `fp8_scaled` để giảm khoảng một nửa RAM model;
- tải `install-report.json` về thư mục output local sau khi hoàn tất.

Các file đã có (lớn hơn 1 MB) được giữ nguyên nên có thể chạy lại an toàn. Nên chuẩn bị ít nhất 40–45 GB trống cho bộ model FP8. Muốn dùng thư mục khác, sửa đối số `--comfyui` trong command của preset.

Trước khi tải model, runner hỏi dung lượng các file còn thiếu, trừ phần `.part` đã tải và giữ 2 GiB dự phòng cho output trên mỗi ổ chứa output. Job dừng sớm nếu thiếu disk hoặc chưa xác định được dung lượng nguồn. Báo cáo `install-report.json` ghi thời gian setup, `run-report.json` ghi thời gian render và xử lý output, còn `job-timings.json` ghi thời gian SSH, upload, chạy remote và tải kết quả về máy.

## Preset chạy SCAIL2 end-to-end

Chọn **SCAIL2 v4.6 · máy yếu (FP8) · 15 giây**, sau đó chọn đúng một ảnh reference và một driving video. Pipeline sẽ tự động:

1. chạy installer nếu ComfyUI, custom nodes, SageAttention, FFmpeg, comfy-cli hoặc model còn thiếu;
2. chuyển video về 30 FPS CFR và đúng 450 frame: clip dài bị cắt ở 15 giây, clip ngắn lặp frame cuối; giữ audio gốc hoặc thêm silent AAC track nếu nguồn không có tiếng;
3. chép input với tên job-unique vào root `ComfyUI/input` để VideoHelperSuite nhận diện video;
4. thay ảnh/video, tháo liên kết INT không tương thích khỏi `force_rate`, chọn diffusion FP8 và đặt output prefix riêng;
5. tự chọn SageAttention FP8++ cho GPU SM89+ hoặc FP16 CUDA cho GPU SM80/SM86;
6. mở một ComfyUI server loopback tạm thời, chuyển UI workflow sang API format và queue bằng comfy-cli;
7. thêm 3 guard frame để Wan sampling 453 frame (`4n+1`), trim về đúng 450 frame, và encode ở native resolution để tránh giữ batch 1080×1920 trong RAM;
8. dừng ComfyUI để giải phóng toàn bộ model, rồi dùng FFmpeg upscale MP4 lên 1080×1920;
9. thu MP4, `run-report.json` và `comfyui.log` về output local rồi xoá input của job.

Nếu WebSocket bị ngắt sau khi sampling, pipeline kiểm tra `/history/{prompt_id}` để phục hồi job đã hoàn tất. Nếu ComfyUI thực sự crash, app tải `comfyui.log` về Local outputs và đưa phần log cuối vào thông báo lỗi.

Lần chạy đầu có thể mất nhiều thời gian vì phải cài và tải model. Các lần sau bỏ qua phần đã có. Pipeline chỉ bind ComfyUI vào `127.0.0.1`, không mở cổng GPU ra Internet.

Preset **SCAIL2 v4.6 · máy khỏe (FP16) · 15 giây** dùng `22_v4.6_full_15s_fast.json` và worker riêng. Worker cài checkpoint FP16 nếu thiếu, tái sử dụng các model dùng chung và tải MP4 1080×1920 do ComfyUI xuất trực tiếp về máy. Workflow lấy 450 frame ở 30 FPS, thêm 3 frame cho sampling và trim 3 frame trước khi xuất.

Chọn **Máy khỏe (FP16) · chỉ cài setup** để cài trước các thành phần và model cho Fast 15s. Preset dùng cùng thư mục ComfyUI với lúc render và tự tải `install-report.json` về Local outputs. Không cần chọn ảnh hoặc video.

## Lưu ý bảo mật

- Server mặc định chỉ listen trên `127.0.0.1`.
- App không đọc nội dung private key; native OpenSSH tự dùng key file hoặc `ssh-agent`.
- Lệnh SSH chỉ được parse, không được chạy bằng local shell. `-L`/`-R`/`-D` được bỏ qua.
- Host key mới được chấp nhận bằng `StrictHostKeyChecking=accept-new`; host key đã thay đổi vẫn bị từ chối.
- File upload tạm bị xoá khi job kết thúc; kết quả local được giữ trong `outputs/`.
- Không đưa app ra Internet nếu chưa thêm authentication và host-key verification.

## Biến môi trường

- `PORT`: cổng local, mặc định `4173`.
- `HOST`: địa chỉ bind, mặc định `127.0.0.1`.
