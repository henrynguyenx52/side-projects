# Muse Studio (Playwright Edition)

Ứng dụng Web App và Cổng API chuẩn OpenAI tương thích được xây dựng lại dựa trên kiến trúc của Muse Studio, nhưng sử dụng **Playwright** và **Node.js Express** thay cho CDP thô và script Win32 C# PowerShell.

Hỗ trợ hoạt động đa nền tảng (**macOS, Windows, Linux**) với trình duyệt Google Chrome hoặc Edge có sẵn trên máy.

---

## 🌟 Điểm nổi bật & Cải tiến so với bản gốc

| Đặc tính | Bản gốc (Muse Studio 1.2.0) | Bản Playwright Web App mới |
| :--- | :--- | :--- |
| **Nền tảng** | Electron đóng gói nặng (~360MB), chỉ chạy Windows (dùng C# P/Invoke `user32.dll`) | Web App thuần Node.js + Playwright, chạy mượt mà trên **macOS, Linux và Windows** |
| **Điều khiển Trình duyệt** | Tự viết CDP qua WebSocket + P/Invoke ẩn cửa sổ bằng PowerShell | **Playwright Persistent Context** chính quy, ổn định, chống crash |
| **Bộ cài đặt** | Cần giải nén file exe và chạy app desktop | Khởi chạy server qua 1 câu lệnh `npm start`, truy cập từ bất kỳ trình duyệt nào trên mạng LAN / VPS |
| **Giao diện Web** | Gắn chặt vào Electron Window | Giao diện Web Dashboard hiện đại, hỗ trợ xem trực tiếp video MP4, tải về, quản lý đa tài khoản |
| **Cổng OpenAI API** | `/v1/chat/completions`, `/v1/images/generations` | Đầy đủ chuẩn OpenAI `/v1`: Chat, Images, và Video (`/v1/videos`) |

---

## 🚀 Các tính năng chính

1. **Tạo Video AI chất lượng cao (5s – 60s):**
   * Tự động nhận diện độ dài (>10s) và kích hoạt kỹ thuật **FFMPEG Multi-clip Stitching**: Yêu cầu Muse.ai chia cảnh, sinh từng đoạn 10s và dùng lệnh ffmpeg trong máy ảo ghép thành 1 file MP4 hoàn chỉnh.
   * Hỗ trợ tỉ lệ khung hình: `9:16` (TikTok/Shorts), `16:9` (YouTube), `1:1`.
   * Tùy chọn độ phân giải: `4K Ultra HD`, `2K QHD`, `1080p`.

2. **Ảnh tham chiếu (Reference Images):**
   * Đính kèm ảnh nhân vật (giữ khuôn mặt, trang phục) và ảnh sản phẩm mẫu.
   * Tự động trích xuất tên sản phẩm từ ảnh chụp Shopee/TikTok Shop qua cú pháp `[[PRODUCT_TITLE: ...]]` để đặt tên file video tự động.

3. **Quản lý đa tài khoản Muse.ai:**
   * Mỗi tài khoản sở hữu một thư mục Profile trình duyệt độc lập trong `data/profiles/`.
   * Hỗ trợ đăng nhập trực quan 1-click (mở cửa sổ Chrome thật để người dùng đăng nhập tài khoản).
   * Tự động lưu `storageState` và kiểm tra trạng thái LIVE / DIE.

4. **Sản xuất hàng loạt (Batch Queue):**
   * Nhập danh sách prompt kịch bản nhiều dòng để tự động xếp hàng và chạy liên tục.

5. **Thư viện Media cục bộ:**
   * Trích xuất video/ảnh trực tiếp từ session Chrome và lưu về thư mục `data/media/`.
   * Phát trực tiếp MP4 trên trình duyệt, tải file hoặc xóa nhanh.

6. **Cổng OpenAI-Compatible API (`http://localhost:18638/v1`):**
   * Cắm trực tiếp vào các công cụ như Dify, NextChat, Chatbox, OpenWebUI.

7. **Phim Điện Ảnh AI (Cinematic Film Studio - 1 Conversation Continuous Pipeline):**
   * Hoạt động trọn vẹn trong **1 cuộc hội thoại duy nhất** trên Muse.ai.
   * Xử lý tuần tự từng phân cảnh (1 by 1): Đợi cảnh trước hoàn tất, tự động trích xuất khung hình cuối (Last Frame Extraction qua FFMPEG) và truyền làm ảnh đầu vào (Reference Frame Continuity) cho cảnh kế tiếp.
   * Cho phép tải lên **ảnh tham chiếu chung cho toàn bộ phim** (giữ nhân vật chính, trang phục, gương mặt, moodboard, bối cảnh) áp dụng xuyên suốt tất cả phân cảnh.
   * Cung cấp các Preset phong cách điện ảnh cao cấp: Classic Hollywood 35mm, Film Noir, Cyberpunk, Wes Anderson, Christopher Nolan IMAX 70mm, 70s Panavision, Makoto Shinkai Anime, Dark Fantasy, v.v. hoặc tùy chỉnh tự do.
   * Tự động ghép nối các phân cảnh thành 1 bộ phim điện ảnh hoàn chỉnh duy nhất bằng FFMPEG.

---

## 🛠️ Hướng dẫn cài đặt & Khởi chạy

### 1. Yêu cầu hệ thống
* Node.js v18 trở lên.
* Đã cài đặt trình duyệt **Google Chrome** (hoặc Microsoft Edge).

### 2. Cài đặt các gói phụ thuộc
```bash
cd /Users/hungnguyen/Documents/side-projects/muse-tool
npm install
```

### 3. Khởi động Web App
```bash
npm start
```

Sau khi chạy lệnh trên, mở trình duyệt và truy cập:
👉 **Web Dashboard:** `http://localhost:18638`  
👉 **OpenAI API Base URL:** `http://localhost:18638/v1`

---

## 📖 Hướng dẫn sử dụng

### Bước 1: Thêm tài khoản Muse.ai
1. Mở tab **Tài khoản Muse** trên giao diện web.
2. Bấm **+ Thêm tài khoản mới** và đặt tên gợi nhớ (VD: `Account 1`).
3. Bấm nút **🔑 Đăng nhập Chrome**: Trình duyệt Chrome sẽ tự động mở trang đăng nhập của Muse.ai.
4. Đăng nhập tài khoản của bạn (Google, Email, v.v.). Khi đăng nhập xong và thấy giao diện chat của Muse.ai, hệ thống sẽ tự động bắt lấy phiên và chuyển trạng thái sang **LIVE**.

### Bước 2: Tạo Video hoặc Ảnh
1. Chuyển sang tab **Tạo Media (Studio)**.
2. Chọn loại: **Video AI** hoặc **Hình ảnh**.
3. Nhập kịch bản Prompt, chọn Tỉ lệ (`9:16`), Độ dài (`20s`), Độ phân giải (`4K`).
4. (Tùy chọn) Tải lên ảnh sản phẩm hoặc ảnh nhân vật mẫu.
5. Bấm **✨ Bắt đầu tạo ngay**.
6. Theo dõi tiến trình từ 0% đến 100%. Khi hoàn thành, video sẽ phát ngay trên màn hình và có nút **⬇️ Tải file về máy**.

---

## 🔌 Tích hợp API (OpenAI Compatible)

### 1. Tạo Video qua curl
```bash
curl -X POST http://localhost:18638/v1/videos \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Cô gái năng động uống trà sữa bên bờ hồ mùa thu, phong cách điện ảnh 4K",
    "duration": "20s",
    "aspect_ratio": "9:16",
    "quality": "4K"
  }'
```

### 2. Tạo hình ảnh (DALL-E 3 Format)
```bash
curl -X POST http://localhost:18638/v1/images/generations \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Chai nước hoa cao cấp trên phiến đá cẩm thạch đen",
    "size": "1080x1920"
  }'
```

### 3. Tích hợp Python (Thư viện `openai`)
```python
from openai import OpenAI

client = OpenAI(
    base_url="http://localhost:18638/v1",
    api_key="none"  # Không yêu cầu key cho server local
)

# Chat completion
response = client.chat.completions.create(
    model="muse-spark",
    messages=[{"role": "user", "content": "Viết kịch bản ngắn quảng cáo son môi"}]
)
print(response.choices[0].message.content)

# Image generation
image_resp = client.images.generate(
    model="muse-image",
    prompt="Sản phẩm son môi cao cấp màu đỏ ruby",
    size="1024x1024"
)
print(image_resp.data[0].url)
```

---

## 📂 Cấu trúc thư mục dự án

```
muse-tool/
├── data/
│   ├── media/             # Nơi lưu trữ tất cả video MP4 và ảnh đã tải về
│   ├── profiles/          # Chứa User Data của từng tài khoản Chrome độc lập
│   └── store.json         # Cơ sở dữ liệu danh sách tài khoản, task, cài đặt
├── public/                # Giao diện Web Dashboard (HTML / CSS / JS)
│   ├── index.html
│   ├── style.css
│   └── app.js
├── src/
│   ├── config.js          # Cấu hình đường dẫn Chrome, cổng, hằng số
│   ├── engine.js          # MusePlaywrightEngine (Playwright Browser Context, Prompt Stitching, DOM Automation)
│   ├── server.js          # Express Server (REST API, Media Streaming, OpenAI /v1)
│   └── store.js           # Quản lý Database cục bộ (Accounts, Tasks, Settings)
├── package.json
└── README.md
```
