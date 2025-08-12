import { Injectable } from '@nestjs/common';
import axios from 'axios';
import { JotformPayloadDto } from './jotform.dto';
import { MyLogger } from 'src/logger/logger';

@Injectable()
export class JotformService {
  private readonly logger = new MyLogger();
  private readonly bitrixUrl: string;

  constructor() {
    if (!process.env.BITRIX24_WEBHOOK_URL) {
      const errorMsg = 'Missing BITRIX24_WEBHOOK_URL in environment variables.';
      throw new Error(errorMsg);
    }
    this.bitrixUrl = process.env.BITRIX24_WEBHOOK_URL;
  }

  async handleSubmission(payload: JotformPayloadDto): Promise<void> {
    const firstName = payload.q4_name.first?.trim() || '';
    const lastName = payload.q4_name.last?.trim() || '';
    const email = payload.q5_email?.trim() || '';
    const phone = payload.q6_phoneNumber?.full?.trim() || '';

    const contact = {
      fields: {
        NAME: firstName,
        LAST_NAME: lastName,
        PHONE: phone ? [{ VALUE: phone, VALUE_TYPE: 'WORK' }] : undefined,
        EMAIL: email ? [{ VALUE: email, VALUE_TYPE: 'WORK' }] : undefined,
      },
      params: { REGISTER_SONET_EVENT: 'Y' },
    };

    // Log thông tin trước khi gửi
    const sendingMsg = `Sending to Bitrix24: ${JSON.stringify(contact)}`;
    this.logger.log(sendingMsg);

    try {
      const response = await axios.post(this.bitrixUrl, contact, {
        headers: { 'Content-Type': 'application/json' },
      });

      const successMsg = `Bitrix24 response: ${JSON.stringify(response.data)}`;
      this.logger.log(successMsg);

      if (response.data?.error) {
        const apiError = response.data.error_description || response.data.error;
        throw new Error(apiError);
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to send contact: ${msg}`);
      throw error;
    }
  }
}
