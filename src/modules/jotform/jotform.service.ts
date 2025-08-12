import { Injectable } from '@nestjs/common';
import axios from 'axios';
import { JotformSubmission } from './jotform.dto';
import { MyLogger } from 'src/logger/logger';

@Injectable()
export class JotformService {
  private readonly logger = new MyLogger();
  private readonly jotformApiKey: string;
  private readonly bitrixUrl: string;

  constructor() {
    if (!process.env.JOTFORM_API_KEY) {
      throw new Error('Missing JOTFORM_API_KEY env variable');
    }
    if (!process.env.BITRIX24_WEBHOOK_URL) {
      throw new Error('Missing BITRIX24_WEBHOOK_URL env variable');
    }
    this.jotformApiKey = process.env.JOTFORM_API_KEY;
    this.bitrixUrl = process.env.BITRIX24_WEBHOOK_URL;
  }

  async getSubmission(submissionId: string): Promise<JotformSubmission> {
    const url = `https://api.jotform.com/submission/${submissionId}?apiKey=${this.jotformApiKey}`;
    this.logger.log(`Fetching submission from Jotform: ${submissionId}`);

    try {
      const response = await axios.get(url);
      if (response.data && response.data.content) {
        this.logger.log(`Received submission data for ${submissionId}`);
        return response.data.content;
      }
      throw new Error('No content in Jotform API response');
    } catch (error) {
      this.logger.error(
        `Failed to fetch submission ${submissionId}: ${error.message}`,
      );
      throw error;
    }
  }

  async processSubmission(submissionId: string): Promise<void> {
    const submission = await this.getSubmission(submissionId);

    // Lấy dữ liệu từ các câu trả lời, thay '4', '5', '6' bằng ID câu hỏi đúng với form bạn
    const firstName = (submission.answers['4'] as any)?.first?.trim() || '';
    const lastName = (submission.answers['4'] as any)?.last?.trim() || '';
    const email = (submission.answers['5'] as any)?.answer?.trim() || '';
    const phone = (submission.answers['6'] as any)?.answer?.trim() || '';

    const contact = {
      fields: {
        NAME: firstName,
        LAST_NAME: lastName,
        EMAIL: email ? [{ VALUE: email, VALUE_TYPE: 'WORK' }] : undefined,
        PHONE: phone ? [{ VALUE: phone, VALUE_TYPE: 'WORK' }] : undefined,
      },
      params: { REGISTER_SONET_EVENT: 'Y' },
    };

    this.logger.log(`Sending contact to Bitrix24: ${JSON.stringify(contact)}`);

    try {
      const response = await axios.post(this.bitrixUrl, contact, {
        headers: { 'Content-Type': 'application/json' },
      });
      this.logger.log(`Bitrix24 response: ${JSON.stringify(response.data)}`);

      if (response.data.error) {
        throw new Error(response.data.error_description || response.data.error);
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to send contact: ${msg}`);
      throw error;
    }
  }
}
