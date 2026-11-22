# Hướng Dẫn Dùng FreeLLMAPI Cho Cửa Sổ Chat Codex (GUI Sidebar) Trong Cursor

Tài liệu này hướng dẫn cách kết nối **cửa sổ chat Codex GUI Sidebar trong Cursor** trực tiếp với **FreeLLMAPI** để chat và lập trình bằng các model miễn phí (Google Gemini 2.0, Groq Llama 3.3, Kilo, v.v.).

---

## 1. Nguyên lý hoạt động

* Khi bạn cài extension **ChatGPT / Codex của OpenAI** (`openai.chatgpt`) trong Cursor, tab chat này chạy ngầm một tiến trình `codex` cục bộ.
* Tiến trình này tự động đọc file cấu hình tại `~/.codex/config.toml`.
* Bằng cách trỏ `model_provider = "freellmapi"` trong file cấu hình, toàn bộ hội thoại trên giao diện chat GUI của Cursor sẽ được chuyển tiếp qua FreeLLMAPI (cổng `3001`), tự động xoay vòng các API key miễn phí.

---

## 2. Các bước cấu hình

### Bước 1: Cấu hình `~/.codex/config.toml`
Mở file `~/.codex/config.toml` (hoặc mở bằng lệnh trong Cursor `Cmd + Shift + P` ➔ chọn `Open Codex Config`):

Thêm đoạn sau vào file cấu hình:

```toml
# --- Đặt FreeLLMAPI làm Provider cho GUI Codex Sidebar ---
model = "auto"
model_provider = "freellmapi"
model_context_window = 128000
model_auto_compact_token_limit = 115200

[model_providers.freellmapi]
name = "FreeLLMAPI"
base_url = "http://localhost:3001/v1"
wire_api = "responses"
env_key = "FREELLMAPI_API_KEY"
requires_openai_auth = false
model_catalog_url = "http://localhost:3001/v1/codex/models"
```

---

### Bước 2: Cấp API Key cho ứng dụng GUI Cursor (macOS)
> ⚠️ **Quan trọng trên macOS:** Ứng dụng GUI (như Cursor mở từ Dock / Spotlight) mặc định không đọc biến môi trường từ `~/.zshrc`. Do đó cần cấp key cho toàn hệ thống macOS:

Mở Terminal và chạy 2 lệnh sau:

```bash
# 1. Cấp key tức thì cho toàn hệ thống macOS (Cursor sẽ đọc được ngay):
launchctl setenv FREELLMAPI_API_KEY "freellmapi-4c1568f7602113c108cbf000fb17a175f864b66c74da52b1"

# 2. Lưu vào .zshrc để mở máy lại vẫn duy trì:
echo 'export FREELLMAPI_API_KEY="freellmapi-4c1568f7602113c108cbf000fb17a175f864b66c74da52b1"' >> ~/.zshrc
```

---

### Bước 3: Khởi chạy FreeLLMAPI Server
Đảm bảo server FreeLLMAPI đang chạy:

```bash
cd /Users/hungnguyen/Documents/side-projects/freellmapi
npm run dev
```
*(Server chạy tại `http://localhost:3001`)*.

---

### Bước 4: Khởi động lại Cursor & Bắt đầu Chat
1. Nhấn **`Cmd + Q`** để tắt hoàn toàn ứng dụng Cursor.
2. Mở lại **Cursor**.
3. Mở tab **Codex Sidebar** (biểu tượng Codex trên thanh bên của Cursor hoặc phím tắt).
4. Bắt đầu chat / ra lệnh viết code:
   * Toàn bộ câu hỏi và lệnh của bạn sẽ được gửi qua FreeLLMAPI.
   * Bạn có thể mở trình duyệt vào [http://localhost:3001](http://localhost:3001) để xem biểu đồ request và model đang phản hồi theo thời gian thực.

---

## 3. Cách chuyển đổi lại khi tài khoản OpenAI hồi token

Nếu bạn muốn chuyển lại về dùng tài khoản OpenAI chính chủ:
1. Mở `~/.codex/config.toml`.
2. Đổi dòng:
   ```toml
   model_provider = "openai"   # hoặc xóa 2 dòng model_provider và model để về mặc định
   ```
3. Khởi động lại Cursor (`Cmd + Q` rồi mở lại).
