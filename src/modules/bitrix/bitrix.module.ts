import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';
import { BitrixService } from './bitrix.service';
import { BitrixController } from './bitrix.controller';
import { Token } from './token.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Token]), // repo cho service
    HttpModule, // để gọi API Bitrix
  ],
  controllers: [BitrixController],
  providers: [BitrixService],
  exports: [BitrixService], // nếu module khác cần dùng
})
export class BitrixModule {}
