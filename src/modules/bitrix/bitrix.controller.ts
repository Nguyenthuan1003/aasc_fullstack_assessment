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
import type { BitrixAPIResponse, Contact } from 'src/interface/bitrix.type';

@Controller()
export class BitrixController {
  private readonly logger = new Logger(BitrixController.name);

  constructor(private readonly bitrix: BitrixService) {}

  /**
   * GET /install
   * Xử lý OAuth flow (code + domain)
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
   * Local App flow (AUTH_ID, REFRESH_ID, AUTH_EXPIRES, DOMAIN)
   */
  @Post('install')
  async installPost(@Body() body: any, @Req() req: Request) {
    const bodyObj = body as Record<string, unknown>;

    const domainRaw = bodyObj.DOMAIN ?? req.query.DOMAIN;
    const authIdRaw = bodyObj.AUTH_ID ?? req.query.AUTH_ID;
    const refreshIdRaw = bodyObj.REFRESH_ID ?? req.query.REFRESH_ID;
    const expiresRaw = bodyObj.AUTH_EXPIRES ?? req.query.AUTH_EXPIRES;

    // Validate tất cả đều là string
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
   * Test gọi API crm.contact.list
   */
  @Get('contacts')
  async listContacts(@Query('portal') portal?: string): Promise<Contact[]> {
    // listContacts đã trả về Contact[]
    return this.bitrix.listContacts(portal);
  }

  /**
   * Health check
   */
  @Get('health')
  health() {
    return { ok: true, ts: Date.now() };
  }
}
