# Henry Motion

Web app local để tạo video chuyển động qua RunningHub mà không cần mở ComfyUI hoặc chỉnh node.

## Chạy app

Từ thư mục `toki-plus-mac`:

```bash
npm run start:standard-web
```

Sau đó mở `http://127.0.0.1:4177`.

## Cần chuẩn bị

1. Email và mật khẩu RunningHub hợp lệ.
2. Tài khoản đó còn free/transition credits.

App local chạy RunningHub WebApp `2113512034955812865`, cho phép chọn `instanceType: default` (Standard) hoặc `instanceType: plus` (Plus), với hai input:

- node `30`: ảnh nhân vật
- node `33`: video chuyển động

Email, mật khẩu và access token chỉ được giữ trong RAM trong lúc task chạy. File upload local được xóa khỏi thư mục tạm sau khi task hoàn tất hoặc thất bại.

Sau khi RunningHub render xong, backend tải kết quả về máy và chạy AutoClean: crop 4,5% mỗi cạnh, scale về kích thước gốc và xóa metadata bằng FFmpeg. Video trên trang kết quả và Jobs là bản local đã xử lý.

Jobs và video đã xử lý được lưu bền vững trong thư mục `.data/` của app. Khi refresh trang hoặc restart server, các Jobs hoàn tất và link xem/tải video vẫn còn.

Đây là đường RunningHub WebApp session, không phải OpenAPI workflow `2120921661394825218` và không fallback sang app khác nếu app được cấu hình lỗi.
