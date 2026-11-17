# Outlook Mail Reader (local OAuth)

Web app local để quản lý tài khoản Outlook/Microsoft, đăng nhập nhanh qua Refresh Token hoặc Device Code OAuth, và đọc 15 email mới nhất qua Microsoft Graph.

## 1. Định dạng Accounts JSON

File `accounts.json` hỗ trợ dạng mảng đối tượng với các trường `ID`, `PASS`, `Refresh_Token`, `Client_id` (hoặc file `.txt` phân tách bằng dấu `|`):

```json
[
  {
    "ID": "name@outlook.com",
    "PASS": "password123",
    "Refresh_Token": "M.C552_BAY.0...",
    "Client_id": "4da73655-ebbc-4d24-8f6f-d99e314e64ab"
  }
]
```

App cũng tương thích linh hoạt với:
- Các biến thể key: `id`, `pass`, `refreshToken`, `clientId` hoặc `ID`, `PASS`, `Refresh_Token`, `Client_id`.
- Dạng dòng text: `ID|PASS|Refresh_Token|Client_id|Recovery_Email`.
- Object map truyền thống: `{ "email": { "pass": "...", ... } }` hoặc `{ "email": "client_id" }`.

Nếu tài khoản có `Refresh_Token`, web app sẽ tự động đăng nhập và mở hộp thư ngay lập tức (không cần nhập mã Device Code). Nếu token hết hạn hoặc chưa có token, app sẽ tự động fallback sang luồng Device Code.

## 2. Chạy app

Yêu cầu Node.js 18 trở lên.

```bash
cd /Users/hungnguyen/Documents/side-projects/outlook-oauth-mail-reader
npm start
```

Mở <http://127.0.0.1:3000>, chọn tài khoản từ danh sách gợi ý hoặc nhập email, bấm **Đọc thư**.

Có thể tùy chỉnh file accounts, tenant hoặc port:

```bash
OUTLOOK_ACCOUNTS_FILE="./accounts.json" OUTLOOK_TENANT="common" PORT=3000 npm start
```

## Bảo mật

- Server chỉ lắng nghe trên `127.0.0.1`, không mở ra mạng ngoài.
- `accounts.json` đã nằm trong `.gitignore` để tránh commit dữ liệu tài khoản lên git.
- Không truyền mật khẩu hoặc refresh token xuống frontend client; frontend chỉ nhận danh sách email và profile khi xác thực thành công.
- Phiên làm việc (session cookie) lưu trữ trong RAM và tự hủy sau 12 giờ hoặc khi tắt server.
