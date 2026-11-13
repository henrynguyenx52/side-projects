# Motion Standard Web

Web app local để chạy workflow Motion Toki Standard mà không cần mở ComfyUI hoặc chỉnh node.

## Chạy app

Từ thư mục `toki-plus-mac`:

```bash
npm run start:standard-web
```

Sau đó mở `http://127.0.0.1:4177`.

## Cần chuẩn bị

1. Email và mật khẩu RunningHub hợp lệ.
2. Tài khoản đó còn free/transition credits.

App local chạy public WebApp riêng `2120937784407310337`, `instanceType: default` và hai input:

- node `30`: ảnh nhân vật
- node `33`: video chuyển động

Email, mật khẩu và access token chỉ được giữ trong RAM trong lúc task chạy. File upload local được xóa khỏi thư mục tạm sau khi task hoàn tất hoặc thất bại.

Đây là đường WebApp session giống Toki, không phải OpenAPI workflow `2120921661394825218`. Backend không fallback sang App của Toki nếu App riêng lỗi.
