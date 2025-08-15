1. Clone code từ github
2. Đăng nhập Bitrix24 với quyền admin và tạo local app: Tài nguyên cho nhà phát triển -> Khác -> Ứng dụng cục bộ -> Tạo app với tùy chọn "máy chủ", cấp quyền truy cập crm, user, im
3. Chạy npm run start:dev và ngrok http 3000 -> Lấy url của ngrok và điền vào đường dẫn xử lý + đường dẫn cài đặt ban đầu với path = /install
4.Tạo file env với các tham số:
  - BITRIX_OAUTH_URL=https://oauth.bitrix.info/oauth/token/
  - BITRIX_CLIENT_ID=<client_id từ Bitrix>
  - BITRIX_CLIENT_SECRET=<client_secret từ Bitrix>
  - BITRIX_REDIRECT_URI=https://abcd1234.ngrok.io/install
5. Test cài app: Đăng nhập bitrix24 -> tài nguyên cho nhà phát triển -> tích hợp -> Double click app -> Cài đặt lại.( note: Không tích vào chỉ kịch bản )
6. Test list contact: Truy cập đường dẫn https://abcd1234.ngrok.io/contact?portal=yourcompany.bitrix24.vn
7. Token có hạn trong 1h, sau 1h sẽ được refresh token.