import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { AxiosError, AxiosResponse } from 'axios';
import { firstValueFrom } from 'rxjs';
import * as qs from 'qs';
import { Token } from './token.entity';
import type {
  BitrixAPIResponse,
  BitrixErrorResponse,
  BitrixListRequest,
  BitrixTokenResponse,
  Contact,
  LocalInstallInput,
  OAuthInstallInput,
} from 'src/interface/bitrix.type';
import { LoggerService } from '../logger/logger/logger.service';

@Injectable()
export class BitrixService {
  constructor(
    @InjectRepository(Token)
    private readonly repo: Repository<Token>, // Repo để lưu token cho các portal
    private readonly cfg: ConfigService, // Lấy các biến env như CLIENT_ID, SECRET...
    private readonly http: HttpService, // Dùng để gọi HTTP đến Bitrix24
    private readonly logger: LoggerService, // Logger tùy biến, ghi log ra console/file
  ) {}

  /**
   * ========== Install qua OAuth 2.0 ==========
   * Đây là luồng cài đặt OAuth "chuẩn" Bitrix:
   * - Lấy code + domain từ query khi user cài app
   * - Gọi Bitrix OAuth endpoint để đổi code lấy access_token + refresh_token
   * - Lưu vào database (Token entity)
   * - Tính expiresAt = thời gian hiện tại + expires_in - 1 phút để refresh sớm
   */
  async handleInstall(
    input: OAuthInstallInput,
  ): Promise<{ message: string; portal: string }> {
    // Kiểm tra input cơ bản
    if (!input.code || !input.domain) {
      throw new Error('Thiếu code hoặc domain khi cài đặt app.');
    }

    // Lấy config OAuth từ env
    const oauthUrl = this.cfg.get<string>('BITRIX_OAUTH_URL');
    const clientId = this.cfg.get<string>('BITRIX_CLIENT_ID');
    const clientSecret = this.cfg.get<string>('BITRIX_CLIENT_SECRET');
    const redirectUri = this.cfg.get<string>('BITRIX_REDIRECT_URI');

    if (!oauthUrl || !clientId || !clientSecret || !redirectUri) {
      throw new Error('Thiếu cấu hình OAuth (env).');
    }

    // Payload chuẩn theo OAuth 2.0
    const payload = {
      grant_type: 'authorization_code',
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      code: input.code,
    };

    // Gọi POST đến Bitrix OAuth endpoint
    const { data }: AxiosResponse<BitrixTokenResponse> = await firstValueFrom(
      this.http.post<BitrixTokenResponse>(oauthUrl, qs.stringify(payload), {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      }),
    );

    // Tính thời điểm token hết hạn (trừ 1 phút để refresh trước)
    const expiresAt = Date.now() + data.expires_in * 1000 - 60_000;

    // Lưu token vào database, nếu portal đã có thì update
    let row = await this.repo.findOne({ where: { portal: input.domain } });
    if (!row) {
      row = this.repo.create({
        portal: input.domain,
        accessToken: data.access_token ?? '',
        refreshToken: data.refresh_token ?? '',
        expiresAt,
      });
    } else {
      row.accessToken = data.access_token ?? '';
      row.refreshToken = data.refresh_token ?? '';
      row.expiresAt = expiresAt;
    }
    await this.repo.save(row);

    this.logger.log(`Installed OK (OAuth): ${input.domain}`);
    return { message: 'Installed OK (OAuth)', portal: input.domain };
  }

  /**
   * ========== Install Local App VN ==========
   * - Khi app VN gửi AUTH_ID / REFRESH_ID thay vì OAuth code
   * - Tương tự handleInstall, lưu token + expiresAt vào DB
   */
  async handleInstallVN(input: LocalInstallInput): Promise<{
    message: string;
    portal: string;
    authId: string;
    expiresAt: number;
  }> {
    const expiresAt = Date.now() + input.expiresIn * 1000 - 60_000;

    let row = await this.repo.findOne({ where: { portal: input.domain } });
    if (!row) {
      row = this.repo.create({
        portal: input.domain,
        accessToken: input.authId,
        refreshToken: input.refreshId,
        expiresAt,
      });
    } else {
      row.accessToken = input.authId;
      row.refreshToken = input.refreshId;
      row.expiresAt = expiresAt;
    }

    await this.repo.save(row);

    this.logger.log(
      `Installed OK (VN): portal=${input.domain}, authId=${input.authId}`,
    );

    return {
      message: 'Installed OK (VN)',
      portal: input.domain,
      authId: input.authId,
      expiresAt,
    };
  }

  /**
   * ========== Refresh token ==========
   * - Tách riêng ra function, dễ gọi khi token hết hạn
   * - Dùng refresh_token để lấy access_token mới
   * - Lưu lại DB và log
   * - Throw nếu refresh thất bại
   */
  private async refreshToken(row: Token): Promise<string> {
    const clientId = this.cfg.get<string>('BITRIX_CLIENT_ID');
    const clientSecret = this.cfg.get<string>('BITRIX_CLIENT_SECRET');
    if (!clientId || !clientSecret)
      throw new Error('Thiếu CLIENT_ID/CLIENT_SECRET.');
    if (!row.refreshToken)
      throw new Error('Không có refresh token để làm mới.');

    const url = String(this.cfg.get<string>('BITRIX_OAUTH_URL'));
    const payload = {
      grant_type: 'refresh_token',
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: row.refreshToken,
    };

    try {
      const { data }: AxiosResponse<BitrixTokenResponse> = await firstValueFrom(
        this.http.post<BitrixTokenResponse>(url, qs.stringify(payload), {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        }),
      );

      // Bitrix có 2 kiểu key (auth/access_token + refresh/refresh_token)
      const newAccess = (data.auth ?? data.access_token ?? '').toString();
      const newRefresh = (data.refresh ?? data.refresh_token ?? '').toString();

      if (!newAccess || !newRefresh)
        throw new Error('Refresh trả về token rỗng.');

      row.accessToken = newAccess;
      row.refreshToken = newRefresh;
      row.expiresAt = Date.now() + data.expires_in * 1000 - 60_000;

      await this.repo.save(row);
      this.logger.log(`Refresh token OK cho portal ${row.portal}`);
      return newAccess;
    } catch (err) {
      const e = err as AxiosError;
      this.logger.error(
        `Refresh token thất bại cho portal ${row.portal}: ${e.message}`,
        e.stack,
      );
      throw new Error('Refresh token thất bại. Hãy cài lại app.');
    }
  }

  /**
   * ========== Lấy token hợp lệ ==========
   * - Nếu token còn hạn -> return luôn
   * - Nếu hết hạn -> gọi refreshToken()
   */
  async getValidToken(portal: string): Promise<string> {
    const row = await this.repo.findOne({ where: { portal } });
    if (!row)
      throw new Error('Chưa có token cho portal. Hãy cài app qua /install.');

    const now = Date.now();
    if (row.expiresAt && now < row.expiresAt && row.accessToken) {
      return row.accessToken;
    }

    return this.refreshToken(row);
  }

  /**
   * ========== Gọi API Bitrix ==========
   * - Tự động attach auth token
   * - Retry 1 lần nếu 401 / INVALID_TOKEN
   * - Xử lý timeout, 4xx, 5xx, lỗi mạng
   * - Ghi log chi tiết cho debug
   */
  async callBitrixAPI<T = any>(
    method: string,
    payload: Record<string, unknown>,
    portal: string,
    timeoutMs = 10000,
  ): Promise<T> {
    const url = `https://${portal}/rest/${method}`;

    try {
      const { data } = await firstValueFrom(
        this.http.post<T>(
          url,
          { ...payload, auth: await this.getValidToken(portal) },
          { timeout: timeoutMs },
        ),
      );
      return data;
    } catch (err: unknown) {
      const axiosErr = err as AxiosError;
      const status = axiosErr.response?.status;
      const statusText = axiosErr.response?.statusText;
      const errData = axiosErr.response?.data as
        | BitrixErrorResponse
        | undefined;

      // Token hết hạn / INVALID_TOKEN -> thử refresh và gọi lại
      if (status === 401 || (errData && errData?.error === 'INVALID_TOKEN')) {
        this.logger.warn(
          `[${portal}] Token hết hạn hoặc không hợp lệ khi gọi ${method}`,
        );
        try {
          await this.getValidToken(portal);
          this.logger.log(
            `[${portal}] Token đã được refresh, thử gọi lại API ${method}`,
          );
          return this.callBitrixAPI<T>(method, payload, portal, timeoutMs);
        } catch (refreshErr) {
          this.logger.error(
            `[${portal}] Refresh token thất bại: ${refreshErr}`,
          );
          throw new Error(
            'Token hết hạn và refresh thất bại. Hãy cài lại app.',
          );
        }
      }

      // Lỗi client 4xx
      if (status && status >= 400 && status < 500) {
        this.logger.error(
          `[${portal}] Lỗi client ${status} ${statusText} khi gọi ${method}`,
          JSON.stringify(errData ?? {}, null, 2),
        );
        throw new Error(`Lỗi client ${status} khi gọi API Bitrix24`);
      }

      // Lỗi server 5xx
      if (status && status >= 500) {
        this.logger.error(
          `[${portal}] Lỗi server ${status} ${statusText} khi gọi ${method}`,
          JSON.stringify(errData ?? {}, null, 2),
        );
        throw new Error(`Lỗi server ${status} khi gọi API Bitrix24`);
      }

      // Timeout / abort
      if (axiosErr.code === 'ECONNABORTED') {
        this.logger.error(`[${portal}] Timeout / Abort khi gọi ${method}`);
        throw new Error('Timeout khi gọi API Bitrix24');
      }

      // Lỗi mạng khác
      this.logger.error(
        `[${portal}] Lỗi khi gọi API ${method}: ${axiosErr.message}`,
        axiosErr.stack,
      );
      throw new Error(`Lỗi khi gọi API Bitrix24: ${axiosErr.message}`);
    }
  }

  /**
   * ========== Helper test crm.contact.list ==========
   * - Dùng để test controller gọi API Bitrix
   * - Payload mặc định: sort theo ID giảm dần, lấy các field cần thiết
   * - Trả về Contact[] từ data.result
   */
  async listContacts(portal?: string): Promise<Contact[]> {
    if (!portal) throw new Error('Portal không được để trống');

    const payload: BitrixListRequest = {
      order: { ID: 'DESC' },
      filter: {},
      select: ['ID', 'NAME', 'PHONE', 'EMAIL', 'ADDRESS', 'WEB'],
    };

    const data = await this.callBitrixAPI<BitrixAPIResponse<Contact[]>>(
      'crm.contact.list',
      payload,
      portal,
    );

    return data.result; // trả về mảng Contact
  }
}
