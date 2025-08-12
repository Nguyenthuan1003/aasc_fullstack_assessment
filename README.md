1. Thiết lập tài khoản Jotform và lấy API Key
Truy cập https://www.jotform.com/ và đăng ký hoặc đăng nhập tài khoản.
Vào trang My Account (Tài khoản của tôi).
Chọn tab API.
Tạo một API Key mới:
Click "Create New Key".
Đặt tên và quyền (chọn quyền Read Submissions hoặc cao hơn).
Copy API Key vừa tạo.
Lưu trữ API Key này để cấu hình cho ứng dụng.
2. Thiết lập webhook trên Bitrix24 và lấy thông tin xác thực
Đăng nhập vào tài khoản Bitrix24 của bạn.
Vào phần Ứng dụng (Applications) hoặc Cài đặt → Webhook.
Tạo một Webhook đầu vào (Incoming Webhook):
Cấp quyền truy cập CRM (ví dụ: quyền tạo/sửa contacts).
Hệ thống sẽ cấp cho bạn một URL webhook, ví dụ:
https://yourdomain.bitrix24.vn/rest/1/your-webhook-code/crm.contact.add.json
Lấy URL này và cấu hình vào biến môi trường BITRIX24_WEBHOOK_URL trong ứng dụng.
3. Cách chạy ứng dụng
Yêu cầu
Node.js (phiên bản >= 18.x)
npm hoặc yarn
- Clone repository
git clone <repo-url>
cd <repo-folder>
- Cài đặt các package
npm install
- Tạo file .env
Tạo file .env ở gốc project với nội dung (thay thế các giá trị phù hợp):
PORT=3000
BITRIX24_WEBHOOK_URL=https://yourdomain.bitrix24.vn/rest/1/your-webhook-code/crm.contact.add.json
JOTFORM_FORM_ID=your_jotform_form_id
JOTFORM_API_KEY=your_jotform_api_key
- Chạy ứng dụng
npm run start
Ứng dụng sẽ lắng nghe trên port bạn cấu hình (mặc định 3000).
4. Cấu hình Webhook Jotform
- Môi trường local:
Tải và cài đặt ngrok từ https://ngrok.com/
Mở terminal, chạy command: ngrok http 3000
Ngrok sẽ cung cấp một URL public, dùng URL này cấu hình webhook trong Jotform
Lưu lại trên Jotform.
Giờ khi có submission mới, Jotform sẽ gửi dữ liệu đến local qua ngrok.
- Môi trường production:
Vào trang quản lý form trên Jotform.
Chọn form bạn muốn theo dõi submission.
Vào Settings → Integrations → Webhooks.
Thêm URL webhook của bạn, ví dụ:
http://your-server-domain/jotform
Mỗi khi có submission mới, Jotform sẽ gửi dữ liệu đến endpoint này.
5. Kiểm tra và log
Ứng dụng sẽ ghi log file trong thư mục /logs/app.log để theo dõi quá trình xử lý.
Kiểm tra log để phát hiện lỗi hoặc theo dõi luồng xử lý.
