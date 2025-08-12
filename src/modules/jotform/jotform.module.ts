import { Module } from '@nestjs/common';
import { JotformController } from './jotform.controller';
import { JotformService } from './jotform.service';
import { HttpModule } from '@nestjs/axios';

/**
 * Module Jotform:
 * - Import HttpModule để có thể gọi HTTP request trong service
 * - Đăng ký controller để nhận webhook từ Jotform
 * - Đăng ký service xử lý logic liên quan đến Jotform và Bitrix24
 */
@Module({
  imports: [HttpModule],
  controllers: [JotformController],
  providers: [JotformService],
})
export class JotformModule {}
