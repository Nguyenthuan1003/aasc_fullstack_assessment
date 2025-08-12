import { Injectable } from '@nestjs/common';
import axios, { AxiosResponse } from 'axios';
import type { JotformSubmission } from './jotform.dto'; // import type từ DTO
import { MyLogger } from 'src/logger/logger';

type UnknownRecord = Record<string, unknown>;

/**
 * Kiểm tra runtime để xác định một giá trị là đối tượng (object) không null.
 * @param v Giá trị bất kỳ
 * @returns true nếu v là object và không null
 */
function isRecord(v: unknown): v is UnknownRecord {
  return typeof v === 'object' && v !== null;
}

/**
 * Kiểm tra runtime để xác định một giá trị là string
 * @param v Giá trị bất kỳ
 * @returns true nếu v là string
 */
function isString(v: unknown): v is string {
  return typeof v === 'string';
}

/**
 * Kiểm tra sơ bộ cấu trúc một JotformSubmission dựa trên các trường bắt buộc.
 * @param v Giá trị bất kỳ
 * @returns true nếu v thỏa mãn cấu trúc tối thiểu của JotformSubmission
 */
function isJotformSubmission(v: unknown): v is JotformSubmission {
  if (!isRecord(v)) return false;
  return isString(v.id) && isString(v.form_id) && isRecord(v.answers);
}

@Injectable()
export class JotformService {
  private readonly logger = new MyLogger();
  private readonly jotformApiKey: string;
  private readonly bitrixUrl: string;

  constructor() {
    // Kiểm tra biến môi trường API key Jotform
    if (!process.env.JOTFORM_API_KEY) {
      throw new Error('Missing JOTFORM_API_KEY env variable');
    }
    // Kiểm tra biến môi trường URL webhook Bitrix24
    if (!process.env.BITRIX24_WEBHOOK_URL) {
      throw new Error('Missing BITRIX24_WEBHOOK_URL env variable');
    }
    this.jotformApiKey = process.env.JOTFORM_API_KEY;
    this.bitrixUrl = process.env.BITRIX24_WEBHOOK_URL;
  }

  /**
   * Lấy submission từ API Jotform dựa trên submissionId
   * - Xử lý trường hợp content trả về là string hoặc object
   * - Tránh unsafe any bằng cách dùng kiểu unknown và kiểm tra kiểu runtime
   * - Ghi log từng bước để dễ theo dõi
   * @param submissionId ID của submission cần lấy
   * @returns Promise<JotformSubmission> đã được kiểm tra kiểu
   * @throws lỗi nếu không lấy được hoặc dữ liệu không hợp lệ
   */
  async getSubmission(submissionId: string): Promise<JotformSubmission> {
    const url = `https://api.jotform.com/submission/${submissionId}?apiKey=${this.jotformApiKey}`;
    this.logger.log(`Fetching submission from Jotform: ${submissionId}`);

    try {
      const response: AxiosResponse<unknown> = await axios.get(url, {
        timeout: 5000,
      });

      // Kiểm tra HTTP status code trả về
      if (response.status !== 200) {
        const msg = `Unexpected HTTP status ${response.status} from Jotform API`;
        this.logger.error(msg);
        throw new Error(msg);
      }

      const respData: unknown = response.data;

      // Lấy trường 'content' trong dữ liệu trả về
      let content: unknown;
      if (isRecord(respData) && 'content' in respData) {
        content = respData.content;
      } else {
        const msg = 'No "content" field in Jotform API response';
        this.logger.error(msg);
        throw new Error(msg);
      }

      // Nếu content là string, thử parse JSON
      let parsedContent: unknown;
      if (isString(content)) {
        try {
          parsedContent = JSON.parse(content);
        } catch {
          this.logger.error(
            'Jotform content is a plain string (not JSON); cannot parse to submission',
          );
          throw new Error('Invalid content format from Jotform API');
        }
      } else if (isRecord(content)) {
        parsedContent = content;
      } else {
        this.logger.error('Unexpected content type from Jotform API');
        throw new Error('Unexpected content format from Jotform API');
      }

      // Kiểm tra parsedContent đúng kiểu JotformSubmission
      if (!isJotformSubmission(parsedContent)) {
        this.logger.error(
          'Parsed Jotform content does not match expected submission shape',
        );
        this.logger.debug(`Parsed content: ${JSON.stringify(parsedContent)}`);
        throw new Error('Invalid submission format from Jotform API');
      }

      this.logger.log(`Received submission data for ${submissionId}`);
      return parsedContent;
    } catch (error) {
      // Xử lý lỗi Axios và các lỗi khác
      if (axios.isAxiosError(error)) {
        const status = error.response?.status;
        const respData: unknown = error.response?.data;

        if (status === 401 || status === 403) {
          this.logger.error(
            `Authentication failed with Jotform API: ${status}`,
          );
          throw new Error('Authentication failed with Jotform API');
        }

        // Xây dựng thông điệp lỗi an toàn từ respData
        let errMsg = 'Unknown error from Jotform API';

        if (isRecord(respData)) {
          const maybeMessage = respData['message'];
          if (isString(maybeMessage)) {
            errMsg = maybeMessage;
          } else {
            try {
              errMsg = JSON.stringify(respData);
            } catch {
              if (typeof respData === 'string') {
                errMsg = respData;
              } else if (typeof respData === 'object' && respData !== null) {
                try {
                  errMsg = JSON.stringify(respData);
                } catch {
                  errMsg = '[Unable to serialize response data]';
                }
              } else {
                errMsg = String(respData);
              }
            }
          }
        } else if (isString(respData)) {
          errMsg = respData;
        } else if (error.message) {
          errMsg = error.message;
        }

        this.logger.error(
          `Jotform API error (${status ?? 'no-status'}): ${errMsg}`,
        );
        throw new Error(errMsg);
      }

      // Lỗi không phải Axios
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.error(`Unexpected error: ${msg}`);
      throw error;
    }
  }

  /**
   * Xử lý submission (lấy dữ liệu và gửi sang Bitrix24)
   * - Lấy dữ liệu submission đã được kiểm tra kiểu an toàn
   * - Trích xuất các trường theo ID câu hỏi từ answers một cách an toàn
   * - Gửi dữ liệu sang Bitrix24 API, kiểm tra lỗi, ghi log
   * @param submissionId ID của submission cần xử lý
   * @throws lỗi nếu không lấy được submission hoặc gửi sang Bitrix24 thất bại
   */
  async processSubmission(submissionId: string): Promise<void> {
    this.logger.log(`Processing submission ID: ${submissionId}`);

    const submission = await this.getSubmission(submissionId);
    // answers trong submission có thể là unknown, nên kiểm tra an toàn
    const answersUnknown = (submission as unknown as UnknownRecord).answers;
    if (!isRecord(answersUnknown)) {
      this.logger.error('Submission.answers is missing or invalid');
      throw new Error('Invalid submission answers');
    }
    const answers = answersUnknown;

    /**
     * Helper lấy giá trị câu trả lời dạng string từ một field ID
     * Jotform có thể lưu câu trả lời ở các trường khác nhau:
     * - 'answer' (string)
     * - 'full' (string)
     * - 'first' và 'last' (string)
     */
    const getAnswerString = (fieldId: string): string | undefined => {
      const field = answers[fieldId];
      if (!isRecord(field)) return undefined;

      // Lấy phần 'answer' bên trong field
      const ans = field.answer;

      if (isString(ans)) {
        return ans.trim();
      }

      if (isRecord(ans)) {
        // Có thể là { first, last } hoặc { full }
        if (isString(ans.full)) return ans.full.trim();
        const first = isString(ans.first) ? ans.first : '';
        const last = isString(ans.last) ? ans.last : '';

        if (first || last) {
          return `${first} ${last}`.trim();
        }
      }

      return undefined;
    };

    // Các ID câu hỏi theo form
    const nameFieldId = '4';
    const emailFieldId = '5';
    const phoneFieldId = '6';

    // Lấy dữ liệu
    const fullName = getAnswerString(nameFieldId) ?? '';
    const email = getAnswerString(emailFieldId) ?? '';
    const phone = getAnswerString(phoneFieldId) ?? '';

    if (!fullName && !email && !phone) {
      this.logger.warn(
        'Submission does not contain usable contact fields; skipping.',
      );
      throw new Error('Submission missing contact information');
    }

    // Tạo payload gửi đến Bitrix24
    const contactPayload: UnknownRecord = {
      fields: {
        NAME: fullName || undefined,
        LAST_NAME: undefined,
        EMAIL: email ? [{ VALUE: email, VALUE_TYPE: 'WORK' }] : undefined,
        PHONE: phone ? [{ VALUE: phone, VALUE_TYPE: 'WORK' }] : undefined,
      },
      params: { REGISTER_SONET_EVENT: 'Y' },
    };

    this.logger.log(
      `Sending contact to Bitrix24: ${JSON.stringify(contactPayload)}`,
    );

    try {
      const response: AxiosResponse<unknown> = await axios.post(
        this.bitrixUrl,
        contactPayload,
        {
          headers: { 'Content-Type': 'application/json' },
          timeout: 5000,
        },
      );

      // Kiểm tra status code HTTP
      if (response.status !== 200) {
        const msg = `Unexpected HTTP status ${response.status} from Bitrix24 API`;
        this.logger.error(msg);
        throw new Error(msg);
      }

      const respData: unknown = response.data;
      // Kiểm tra trường error trong phản hồi Bitrix24
      if (isRecord(respData) && 'error' in respData) {
        const maybe = respData['error_description'] ?? respData['error'];
        const errMsg = isString(maybe)
          ? maybe
          : (() => {
              try {
                return JSON.stringify(respData);
              } catch {
                return String(maybe);
              }
            })();
        this.logger.error(`Bitrix24 API error: ${errMsg}`);
        throw new Error(errMsg);
      }

      this.logger.log(`Bitrix24 response: ${JSON.stringify(respData)}`);
    } catch (error) {
      // Xử lý lỗi khi gọi Bitrix24 API
      if (axios.isAxiosError(error)) {
        const status = error.response?.status;
        const respData: unknown = error.response?.data;

        let errMsg = 'Unknown error from Bitrix24 API';
        if (isRecord(respData)) {
          const maybeMessage =
            respData['error_description'] ?? respData['error'];
          if (isString(maybeMessage)) errMsg = maybeMessage;
          else {
            try {
              errMsg = JSON.stringify(respData);
            } catch {
              if (typeof respData === 'string') {
                errMsg = respData;
              } else if (typeof respData === 'object' && respData !== null) {
                try {
                  errMsg = JSON.stringify(respData);
                } catch {
                  errMsg = '[Unable to serialize response data]';
                }
              } else {
                errMsg = String(respData);
              }
            }
          }
        } else if (isString(respData)) {
          errMsg = respData;
        } else if (error.message) {
          errMsg = error.message;
        }

        this.logger.error(
          `Bitrix24 API error (${status ?? 'no-status'}): ${errMsg}`,
        );
        throw new Error(errMsg);
      }

      const msg = error instanceof Error ? error.message : String(error);
      this.logger.error(`Unexpected error sending to Bitrix24: ${msg}`);
      throw error;
    }
  }
}
