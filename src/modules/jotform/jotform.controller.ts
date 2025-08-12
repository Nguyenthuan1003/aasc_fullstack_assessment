import {
  Controller,
  Post,
  BadRequestException,
  UseInterceptors,
  Body,
} from '@nestjs/common';
import { AnyFilesInterceptor } from '@nestjs/platform-express';
import { JotformService } from './jotform.service';
import { MyLogger } from 'src/logger/logger';
import { type JotformWebhookBody } from 'src/interfaces/jotform.types';

@Controller('jotform')
export class JotformController {
  private readonly logger = new MyLogger();

  constructor(private readonly jotformService: JotformService) {}

  /**
   * POST /jotform
   *
   * Endpoint nhận webhook gửi từ Jotform khi có submission mới.
   *
   * @UseInterceptors(AnyFilesInterceptor()) để hỗ trợ nhận payload dạng multipart/form-data kèm file (nếu có).
   *
   * @param body Đối tượng chứa payload webhook, kiểu JotformWebhookBody.
   *
   * Quy trình xử lý:
   * - Kiểm tra trường submissionID tồn tại và là chuỗi hợp lệ.
   * - Gọi service xử lý submission (lấy dữ liệu chi tiết từ Jotform qua API, gửi dữ liệu tới Bitrix24, ghi log).
   * - Nếu có lỗi trong quá trình lấy hoặc xử lý, ghi log lỗi và trả về lỗi 400 BadRequest.
   *
   * @returns Trả về JSON { status: 'ok' } nếu xử lý thành công.
   *
   * @throws BadRequestException nếu submissionID không hợp lệ hoặc lỗi trong quá trình xử lý.
   */
  @Post()
  @UseInterceptors(AnyFilesInterceptor())
  async handleWebhook(
    @Body() body: JotformWebhookBody,
  ): Promise<{ status: string }> {
    // Lấy submissionID từ body webhook
    const submissionId = body.submissionID;

    // Kiểm tra submissionID phải tồn tại và là string không rỗng
    if (!submissionId || typeof submissionId !== 'string') {
      this.logger.warn('Missing or invalid submissionID');
      throw new BadRequestException('Missing or invalid submissionID');
    }

    try {
      // Gọi service xử lý submission, bao gồm lấy dữ liệu từ API Jotform và gửi sang Bitrix24
      const submissionData =
        await this.jotformService.processSubmission(submissionId);

      // Ghi log thông tin submission nhận được (debug, theo dõi)
      this.logger.log(
        `Received submission data: ${JSON.stringify(submissionData)}`,
      );
    } catch (error) {
      // Xử lý lỗi, ghi log chi tiết, trả lỗi cho client webhook
      const msg = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Error fetching submission data: ${msg}`);
      throw new BadRequestException(msg);
    }

    // Trả về thành công cho Jotform biết webhook đã được xử lý
    return { status: 'ok' };
  }
}
