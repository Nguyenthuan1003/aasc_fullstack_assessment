import { IsString, IsOptional } from 'class-validator';

// Đại diện câu trả lời dạng tên, có thể có first và last
export class JotformAnswerName {
  @IsOptional()
  @IsString()
  first?: string; // Tên (first name)

  @IsOptional()
  @IsString()
  last?: string; // Họ (last name)
}

// Đại diện câu trả lời chung, có thể có answer hoặc first, last
export class JotformAnswer {
  @IsOptional()
  answer?: string; // Trả lời dạng chuỗi, ví dụ email hoặc số điện thoại

  @IsOptional()
  first?: string; // Tên, nếu có

  @IsOptional()
  last?: string; // Họ, nếu có
}

// Đại diện cho toàn bộ câu trả lời của một submission
// answers lưu dưới dạng object với key là ID câu hỏi, value là câu trả lời
export class JotformSubmission {
  answers: Record<string, JotformAnswer | JotformAnswerName>;
}
