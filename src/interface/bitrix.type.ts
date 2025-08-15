/** ===== Thông tin liên hệ (Contact) ===== */
export interface Contact {
  ID: string; // ID của contact trong Bitrix24
  NAME: string; // Tên contact
  PHONE?: string; // Số điện thoại (có thể không có)
  EMAIL?: string; // Email (có thể không có)
  ADDRESS?: string; // Địa chỉ (có thể không có)
  WEB?: string; // Website (có thể không có)
}

/** ===== Response từ API Bitrix ===== */
export interface BitrixAPIResponse<T> {
  result: T; // dữ liệu chính trả về (ví dụ array contact)
  total?: number; // tổng số record (nếu API trả)
  next?: number; // pagination (nếu có)
  time?: {
    // thông tin thời gian xử lý request
    start: number;
    finish: number;
    duration: number;
    processing: number;
    date_start: string;
    date_finish: string;
  };
}

/** ===== Request để list dữ liệu từ Bitrix ===== */
export interface BitrixListRequest extends Record<string, unknown> {
  order?: Record<string, 'ASC' | 'DESC'>; // sắp xếp theo field
  filter?: Record<string, unknown>; // filter theo điều kiện
  select?: string[]; // chỉ lấy những field nào
}

/** ===== Input cho OAuth cài đặt app ===== */
export interface OAuthInstallInput {
  code: string; // code trả về từ Bitrix khi user install app
  domain: string; // domain của portal Bitrix
}

/** ===== Input cho Local App flow (VN) ===== */
export interface LocalInstallInput {
  domain: string; // domain của portal
  authId: string; // access token local
  refreshId: string; // refresh token local
  expiresIn: number; // thời gian sống token (giây)
}

/** ===== Response token từ Bitrix ===== */
export interface BitrixTokenResponse {
  // OAuth classic
  access_token?: string;
  refresh_token?: string;
  // Local App (AUTH/REFRESH)
  auth?: string;
  refresh?: string;
  expires_in: number; // thời gian sống token (giây)
  [key: string]: unknown; // các field khác Bitrix có thể trả
}

/** ===== Response lỗi từ Bitrix ===== */
export interface BitrixErrorResponse {
  error?: string; // ví dụ 'INVALID_TOKEN', 'BAD_REQUEST', ...
  [key: string]: unknown; // các thông tin lỗi khác
}
