// jotform.controller.ts
import {
  Controller,
  Post,
  Req,
  BadRequestException,
  UseInterceptors,
} from '@nestjs/common';
import { type Request } from 'express';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { JotformPayloadDto } from './jotform.dto';
import { JotformService } from './jotform.service';
import { MultipartFormDataInterceptor } from './jotform.interceptor';
import { MyLogger } from 'src/logger/logger';

@Controller('jotform')
export class JotformController {
  private readonly logger = new MyLogger();

  constructor(private readonly jotformService: JotformService) {}

  @Post()
  @UseInterceptors(MultipartFormDataInterceptor)
  async handleWebhook(@Req() req: Request): Promise<{ status: string }> {
    this.logger.log('Webhook received');

    // Sau khi multer parse, req.body có dạng các trường form-data text
    const rawRequest = req.body.rawRequest;
    if (typeof rawRequest !== 'string') {
      this.logger.warn('rawRequest missing or not a string');
      throw new BadRequestException('Missing or invalid rawRequest field');
    }

    let parsedData: unknown;
    try {
      parsedData = JSON.parse(rawRequest);
    } catch (err) {
      this.logger.warn('rawRequest is not valid JSON');
      throw new BadRequestException('Invalid JSON in rawRequest');
    }

    // Chuyển thành DTO, validate
    const dto = plainToInstance(JotformPayloadDto, parsedData);
    const errors = await validate(dto);
    if (errors.length > 0) {
      const errorMsg = `Validation failed: ${JSON.stringify(errors)}`;
      this.logger.warn(errorMsg);
      throw new BadRequestException('Validation failed');
    }

    try {
      await this.jotformService.handleSubmission(dto);
      this.logger.log('Submission sent to Bitrix24 successfully');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      this.logger.error(`Error sending submission: ${message}`);
      throw new BadRequestException(message);
    }

    return { status: 'ok' };
  }
}
