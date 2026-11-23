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

Ví dụ:

```bash
python /opt/my-model/infer.py \
  --images {images} \
  --videos {videos} \
  --prompt {prompt} \
  --output {output_dir}
```

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
