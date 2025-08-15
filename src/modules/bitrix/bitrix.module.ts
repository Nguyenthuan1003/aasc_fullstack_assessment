import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';
import { BitrixService } from './bitrix.service';
import { BitrixController } from './bitrix.controller';
import { Token } from './token.entity';
import { LoggerService } from '../logger/logger/logger.service';

@Module({
  // ==== Module imports ====
  // 1. TypeOrmModule.forFeature([Token])
  //    - Đăng ký entity Token để inject Repository<Token> vào service
  //    - BitrixService dùng repo này để lưu/đọc access/refresh token
  // 2. HttpModule
  //    - Cung cấp HttpService để gọi API Bitrix qua axios
  imports: [TypeOrmModule.forFeature([Token]), HttpModule],

  // ==== Controllers ====
  // BitrixController chứa các endpoint /install, /contacts, /health
  controllers: [BitrixController],

  // ==== Providers ====
  // 1. BitrixService: nơi chứa toàn bộ logic install, refresh token, gọi API Bitrix
  // 2. LoggerService: custom logger, để service có thể ghi log ra file hoặc console
  providers: [BitrixService, LoggerService],

  // ==== Exports ====
  // Export BitrixService để module khác (nếu có) có thể inject và sử dụng
  exports: [BitrixService],
})
export class BitrixModule {}
