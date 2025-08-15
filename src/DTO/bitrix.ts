import { IsNotEmpty, IsString, IsNumberString } from 'class-validator';

/**
 * DTO cho Local App flow (VN) khi Bitrix24 gửi thông tin cài đặt app
 *
 * Các field này dùng để lưu token, thời hạn token, và domain của portal.
 */
export class InstallVNDto {
  // ===== AUTH_ID =====
  // access token do Bitrix24 cấp cho app local
  // Bắt buộc, phải là string và không rỗng
  @IsString()
  @IsNotEmpty()
  AUTH_ID!: string;

  // ===== REFRESH_ID =====
  // refresh token dùng để lấy lại access token khi hết hạn
  // Bắt buộc, phải là string và không rỗng
  @IsString()
  @IsNotEmpty()
  REFRESH_ID!: string;

  // ===== AUTH_EXPIRES =====
  // Thời gian sống của token (tính bằng giây)
  // Bitrix24 gửi dưới dạng string nhưng phải parse thành number khi lưu
  @IsNumberString()
  @IsNotEmpty()
  AUTH_EXPIRES!: string;

  // ===== DOMAIN =====
  // Domain của portal Bitrix24
  // Không bắt buộc, nếu không có sẽ lấy từ query params
  @IsString()
  DOMAIN?: string;
}
