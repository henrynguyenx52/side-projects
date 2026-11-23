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

App cho phép chọn 8 model Motion Toki, gồm Front + Back, Toki 2.1, bản 30 FPS và 60 FPS ở hai mức Standard / AI Plus. Model đã chọn quyết định `workflowId` hoặc `appId` và `instanceType` gửi tới RunningHub.

Các App dùng hai input chính:

- node `30`: ảnh nhân vật
- node `33`: video chuyển động

Model Front + Back yêu cầu thêm ảnh mặt sau ở node `426`, đồng thời bật node `454`. Các model 30 FPS gửi thêm `upscale_method: bicubic` tại node `308`.

Email, mật khẩu và access token chỉ được giữ trong RAM trong lúc task chạy. File upload local được xóa khỏi thư mục tạm sau khi task hoàn tất hoặc thất bại.

Sau khi RunningHub render xong, backend tải kết quả về máy và chạy AutoClean: crop 4,5% mỗi cạnh, scale về kích thước gốc và xóa metadata bằng FFmpeg. Video trên trang kết quả và Jobs là bản local đã xử lý.

Jobs và video đã xử lý được lưu bền vững trong thư mục `.data/` của app. Khi refresh trang hoặc restart server, các Jobs hoàn tất và link xem/tải video vẫn còn.

App đăng nhập RunningHub bằng email/mật khẩu, sau đó gửi đúng loại target như client chính: model có `workflowId` gọi `/openapi/v2/run/workflow/{id}`, model có `appId` gọi `/openapi/v2/run/ai-app/{id}`. App không tự fallback sang model khác nếu model đã chọn bị RunningHub từ chối.
