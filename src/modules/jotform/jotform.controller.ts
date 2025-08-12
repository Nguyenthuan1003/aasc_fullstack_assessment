import { Controller, Post, Body, BadRequestException } from '@nestjs/common';
import { JotformService } from './jotform.service';
import { MyLogger } from 'src/logger/logger';
import type { JotformWebhookBody } from 'src/interfaces/jotform.types';

@Controller('jotform')
export class JotformController {
  private readonly logger = new MyLogger();

  constructor(private readonly jotformService: JotformService) {}

  /**
   * Endpoint webhook POST nhận dữ liệu submission từ Jotform
   * - Kiểm tra tính hợp lệ của dữ liệu đầu vào (submissionID)
   * - Gọi service để xử lý submission
   * - Xử lý lỗi và trả về BadRequestException nếu có lỗi
   * @param body Dữ liệu webhook gửi tới, bao gồm submissionID
   * @returns { status: string } trả về trạng thái xử lý
   * @throws BadRequestException nếu dữ liệu đầu vào không hợp lệ hoặc xử lý thất bại
   */
  @Post()
  async handleWebhook(
    @Body() body: JotformWebhookBody,
  ): Promise<{ status: string }> {
    this.logger.log('Webhook received');

    // Kiểm tra trường submissionID phải tồn tại và là string
    if (typeof body.submissionID !== 'string') {
      this.logger.warn('Invalid or missing submissionID in webhook body');
      throw new BadRequestException('submissionID missing or invalid');
    }

    const submissionId: string = body.submissionID;

    // Kiểm tra thêm submissionId không rỗng
    if (!submissionId) {
      this.logger.warn('Empty submissionID received');
      throw new BadRequestException('Missing or invalid submissionID');
    }

    try {
      // Gọi service xử lý submission (lấy dữ liệu, gửi Bitrix24, ghi log...)
      await this.jotformService.processSubmission(submissionId);
      this.logger.log(`Processed submissionID: ${submissionId} successfully`);
    } catch (error) {
      // Ghi log lỗi và trả lỗi 400 Bad Request cho client webhook
      const msg = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Error processing submissionID: ${msg}`);
      throw new BadRequestException(msg);
    }

    // Trả về trạng thái thành công cho webhook sender
    return { status: 'ok' };
  }
}
