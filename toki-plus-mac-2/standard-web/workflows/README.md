# Workflow variants

## motion-standard-quality-optimized.json

Bản giữ nguyên chất lượng HD của workflow gốc và chỉ bypass node `393` (`VHS_VideoCombine` preview/temp).

- Node `489` upscale HD vẫn active.
- Node `490` final HD output vẫn active.
- Model, sampler, prompt, kích thước và các node khác không thay đổi.

Sau khi import vào RunningHub, chạy thử một job, lưu workflow rồi cập nhật hoặc publish lại AI App. App ID có thể thay đổi nếu xuất bản thành App mới.
