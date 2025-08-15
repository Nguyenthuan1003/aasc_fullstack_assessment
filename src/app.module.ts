import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';
import { Token } from './modules/bitrix/token.entity';
import { BitrixModule } from './modules/bitrix/bitrix.module';
import { LoggerService } from './modules/logger/logger/logger.service';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    HttpModule.register({ timeout: 12000 }),
    TypeOrmModule.forRoot({
      type: 'sqlite',
      database: process.env.DB_PATH || './data/app.sqlite',
      entities: [Token],
      synchronize: true, // chỉ bật khi dev/test
    }),
    BitrixModule, // 👈 gói con xử lý Bitrix
  ],
  providers: [LoggerService],
})
export class AppModule {}
