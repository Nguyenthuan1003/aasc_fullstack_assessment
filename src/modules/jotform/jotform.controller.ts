import { Controller, Post, Body, BadRequestException } from '@nestjs/common';
import { JotformService } from './jotform.service';
import { MyLogger } from 'src/logger/logger';

@Controller('jotform')
export class JotformController {
  private readonly logger = new MyLogger();

  constructor(private readonly jotformService: JotformService) {}

  @Post()
  async handleWebhook(@Body() body: any): Promise<{ status: string }> {
    this.logger.log('Webhook received');

    const submissionId = body.submissionID;
    if (!submissionId || typeof submissionId !== 'string') {
      this.logger.warn('Missing or invalid submissionID in webhook');
      throw new BadRequestException('Missing or invalid submissionID');
    }

    try {
      await this.jotformService.processSubmission(submissionId);
      this.logger.log(`Processed submissionID: ${submissionId} successfully`);
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Error processing submissionID: ${msg}`);
      throw new BadRequestException(msg);
    }

    return { status: 'ok' };
  }
}
