/**
 * Tên người dùng, bao gồm firstname và lastname
 */
export interface Name {
  first: string;
  last: string;
}

/**
 * Số điện thoại đầy đủ dạng chuỗi
 */
export interface PhoneNumber {
  full: string;
}

/**
 * Cấu trúc dữ liệu webhook gửi từ Jotform
 * - Bao gồm nhiều trường mặc định và các trường form data (ví dụ q4_name, q5_email, q6_phoneNumber)
 * - Có thể chứa các trường động khác nên có index signature
 */
export interface JotformWebhookBody {
  slug: string;
  jsExecutionTracker: string;
  submitSource: string;
  submitDate: string;
  buildDate: string;
  uploadServerUrl: string;
  eventObserver: string;
  q4_name: Name; // Trường tên trong form, id là q4
  q6_phoneNumber: PhoneNumber; // Trường số điện thoại, id là q6
  q5_email: string; // Trường email, id là q5
  event_id: string;
  timeToSubmit: string;
  validatedNewRequiredFieldIDs: string;
  path: string;

  // Các trường khác động, kiểu unknown để linh hoạt
  [key: string]: unknown;
}

/**
 * Submission trả về từ API Jotform
 * - id: ID submission
 * - form_id: ID form
 * - ip: địa chỉ IP submit
 * - created_at: thời gian tạo submission
 * - status: trạng thái submission
 * - answers: bản ghi câu trả lời (key: question id, value: nội dung)
 */
export interface JotformSubmission {
  id: string;
  form_id: string;
  ip: string;
  created_at: string;
  status: string;
  answers: Record<string, unknown>;
}

/**
 * Cấu trúc dữ liệu trả về API Jotform
 * - responseCode: mã trả về từ API
 * - message: thông báo
 * - content: nội dung submission (có thể là đối tượng hoặc string JSON)
 */
export interface JotformApiResponse {
  responseCode: number;
  message: string;
  content: JotformSubmission | string;
}
