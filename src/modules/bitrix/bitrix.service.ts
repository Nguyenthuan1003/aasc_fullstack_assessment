import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { AxiosError, AxiosResponse } from 'axios';
import { firstValueFrom } from 'rxjs';
import * as qs from 'qs';
import { Token } from './token.entity';
import type { BitrixAPIResponse, BitrixListRequest, Contact } from 'src/interface/bitrix.type';

/** ==== Input types ==== */
interface OAuthInstallInput {
  code: string;
  domain: string;
}

interface LocalInstallInput {
  domain: string;
  authId: string;
  refreshId: string;
  expiresIn: number; // giây
}

/** ==== Bitrix response types ==== */
interface BitrixTokenResponse {
  // Classic OAuth
  access_token?: string;
  refresh_token?: string;
  // Local App (AUTH/REFRESH)
  auth?: string;
  refresh?: string;
  expires_in: number;
  [key: string]: unknown;
}

@Injectable()
export class BitrixService {
  private readonly logger = new Logger(BitrixService.name);

  constructor(
    @InjectRepository(Token)
    private readonly repo: Repository<Token>,
    private readonly cfg: ConfigService,
    private readonly http: HttpService,
  ) {}

  /** ========== Install qua OAuth 2.0 ========== */
  async handleInstall(
    input: OAuthInstallInput,
  ): Promise<{ message: string; portal: string }> {
    if (!input.code || !input.domain) {
      throw new Error('Thiếu code hoặc domain khi cài đặt app.');
    }

    const oauthUrl = this.cfg.get<string>('BITRIX_OAUTH_URL');
    const clientId = this.cfg.get<string>('BITRIX_CLIENT_ID');
    const clientSecret = this.cfg.get<string>('BITRIX_CLIENT_SECRET');
    const redirectUri = this.cfg.get<string>('BITRIX_REDIRECT_URI');

    if (!oauthUrl || !clientId || !clientSecret || !redirectUri) {
      throw new Error('Thiếu cấu hình OAuth (env).');
    }

    const payload = {
      grant_type: 'authorization_code',
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      code: input.code,
    };

    const { data }: AxiosResponse<BitrixTokenResponse> = await firstValueFrom(
      this.http.post<BitrixTokenResponse>(oauthUrl, qs.stringify(payload), {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      }),
    );

    const expiresAt = Date.now() + data.expires_in * 1000 - 60_000;

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

  /** ========== Install Local App (AUTH_ID/REFRESH_ID) ========== */
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

  /** ========== Refresh token riêng biệt (rõ ràng) ========== */
  private async refreshToken(row: Token): Promise<string> {
    const clientId = this.cfg.get<string>('BITRIX_CLIENT_ID');
    const clientSecret = this.cfg.get<string>('BITRIX_CLIENT_SECRET');
    if (!clientId || !clientSecret) {
      throw new Error('Thiếu CLIENT_ID/CLIENT_SECRET.');
    }
    if (!row.refreshToken) {
      throw new Error('Không có refresh token để làm mới.');
    }

    const url = 'https://oauth.bitrix.info/oauth/token/';
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

      // Bitrix có 2 format key, handle cả hai
      const newAccess = (data.auth ?? data.access_token ?? '').toString();
      const newRefresh = (data.refresh ?? data.refresh_token ?? '').toString();

      if (!newAccess || !newRefresh) {
        throw new Error('Refresh trả về token rỗng.');
      }

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

  /** ========== Lấy access token hợp lệ (tự refresh khi cần) ========== */
  async getValidToken(portal: string): Promise<string> {
    const row = await this.repo.findOne({ where: { portal } });
    if (!row) {
      throw new Error('Chưa có token cho portal. Hãy cài app qua /install.');
    }

    const now = Date.now();
    if (row.expiresAt && now < row.expiresAt && row.accessToken) {
      return row.accessToken;
    }
    // Hết hạn -> refresh
    return this.refreshToken(row);
  }

  /** ========== Gọi API Bitrix (retry 1 lần nếu 401/INVALID_TOKEN) ========== */
  async callBitrixAPI<T = any>(
    method: string,
    payload: Record<string, unknown>,
    portal: string,
    timeoutMs = 10000, // timeout 10s
  ): Promise<T> {
    const url = `https://${portal}/rest/${method}`;

    try {
      const { data } = await firstValueFrom(
        this.http.post(
          url,
          { ...payload, auth: await this.getValidToken(portal) },
          { timeout: timeoutMs },
        ),
      );
      return data as T;
    } catch (err: unknown) {
      // Cast lỗi sang AxiosError để đọc response
      const axiosErr = err as AxiosError;
      const status = axiosErr.response?.status;
      const statusText = axiosErr.response?.statusText;
      const errData = axiosErr.response?.data;

      if (
        status === 401 ||
        (errData && (errData as any).error === 'INVALID_TOKEN')
      ) {
        this.logger.warn(
          `[${portal}] Token hết hạn hoặc không hợp lệ khi gọi ${method}`,
        );
        // Thử refresh token tự động
        try {
          await this.getValidToken(portal); // refresh token
          this.logger.log(
            `[${portal}] Token đã được refresh, thử gọi lại API ${method}`,
          );
          return this.callBitrixAPI<T>(method, payload, portal, timeoutMs); // gọi lại
        } catch (refreshErr) {
          this.logger.error(
            `[${portal}] Refresh token thất bại: ${refreshErr}`,
          );
          throw new Error(
            'Token hết hạn và refresh thất bại. Hãy cài lại app.',
          );
        }
      }

      if (status && status >= 400 && status < 500) {
        this.logger.error(
          `[${portal}] Lỗi client ${status} ${statusText} khi gọi ${method}`,
          errData,
        );
        throw new Error(`Lỗi client ${status} khi gọi API Bitrix24`);
      }

      if (status && status >= 500) {
        this.logger.error(
          `[${portal}] Lỗi server ${status} ${statusText} khi gọi ${method}`,
          errData,
        );
        throw new Error(`Lỗi server ${status} khi gọi API Bitrix24`);
      }

      if (axiosErr.code === 'ECONNABORTED') {
        this.logger.error(`[${portal}] Timeout / Abort khi gọi ${method}`);
        throw new Error('Timeout khi gọi API Bitrix24');
      }

      // Lỗi mạng / khác
      this.logger.error(
        `[${portal}] Lỗi khi gọi API ${method}: ${axiosErr.message}`,
        axiosErr.stack,
      );
      throw new Error(`Lỗi khi gọi API Bitrix24: ${axiosErr.message}`);
    }
  }

  /** ========== Để controller gọi test crm.contact.list ========== */
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

    return data.result; // lấy result đúng type
  }
}
