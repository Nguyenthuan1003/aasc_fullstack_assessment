import {
  Controller,
  Get,
  Post,
  Query,
  Body,
  Req,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import type { Request } from 'express';
import { BitrixService } from './bitrix.service';
import type { Contact } from 'src/interface/bitrix.type';

@Controller()
export class BitrixController {
  private readonly logger = new Logger(BitrixController.name); 
  // Logger NestJS cơ bản, ghi log console. Có thể thay bằng LoggerService nếu muốn ghi file

  constructor(private readonly bitrix: BitrixService) {}
  // Inject BitrixService để gọi các hàm handleInstall, listContacts...

  /**
   * GET /install
   * ===== OAuth flow =====
   * - Bitrix redirect user về endpoint này với query: code + domain
   * - Validate code và domain
   * - Gọi service.handleInstall() để đổi code lấy token và lưu DB
   */
  @Get('install')
  async installGet(
    @Query('code') code?: string,
    @Query('domain') domain?: string,
  ) {
    if (!code || !domain) {
      throw new BadRequestException('Thiếu code hoặc domain cho OAuth flow');
    }
    return this.bitrix.handleInstall({ code, domain });
  }

  /**
   * POST /install
   * ===== Local App flow =====
   * - Local app gửi thông tin AUTH_ID, REFRESH_ID, AUTH_EXPIRES, DOMAIN
   * - Body có thể là JSON, query cũng được (Bitrix POST gửi kiểu form hoặc query)
   * - Validate input: tất cả phải là string + AUTH_EXPIRES phải parse được ra number
   * - Gọi service.handleInstallVN() để lưu token + expires vào DB
   */
  @Post('install')
  async installPost(@Body() body: any, @Req() req: Request) {
    const bodyObj = body as Record<string, unknown>;

    const domainRaw = bodyObj.DOMAIN ?? req.query.DOMAIN;
    const authIdRaw = bodyObj.AUTH_ID ?? req.query.AUTH_ID;
    const refreshIdRaw = bodyObj.REFRESH_ID ?? req.query.REFRESH_ID;
    const expiresRaw = bodyObj.AUTH_EXPIRES ?? req.query.AUTH_EXPIRES;

    // Validate tất cả phải là string
    if (
      typeof domainRaw !== 'string' ||
      typeof authIdRaw !== 'string' ||
      typeof refreshIdRaw !== 'string' ||
      typeof expiresRaw !== 'string'
    ) {
      throw new BadRequestException(
        'Các params DOMAIN, AUTH_ID, REFRESH_ID, AUTH_EXPIRES phải là string',
      );
    }

    const expiresIn = Number(expiresRaw);
    if (Number.isNaN(expiresIn)) {
      throw new BadRequestException('AUTH_EXPIRES phải là một số');
    }

    return this.bitrix.handleInstallVN({
      domain: domainRaw,
      authId: authIdRaw,
      refreshId: refreshIdRaw,
      expiresIn,
    });
  }

  /**
   * GET /contacts
   * ===== Test API Bitrix =====
   * - Dùng để test gọi crm.contact.list
   * - portal là domain của Bitrix
   * - service.listContacts() đã handle token, refresh, call API, xử lý lỗi
   * - Trả về mảng Contact[]
   */
  @Get('contacts')
  async listContacts(@Query('portal') portal?: string): Promise<Contact[]> {
    return this.bitrix.listContacts(portal);
  }

  /**
   * GET /health
   * ===== Health check endpoint =====
   * - Dùng để kiểm tra server đang live
   * - Trả về ok + timestamp
   */
  @Get('health')
  health() {
    return { ok: true, ts: Date.now() };
  }
}
