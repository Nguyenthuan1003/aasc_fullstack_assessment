import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { JotformModule } from './modules/jotform/jotform.module';
import { ConfigModule } from '@nestjs/config';
import { MyLogger } from './logger/logger';

/**
 * - Import các module con như JotformModule để quản lý tính năng riêng
 * - ConfigModule được cấu hình global để load biến môi trường
 * - Đăng ký MyLogger làm provider để có thể inject logger ở bất kỳ đâu
 */
@Module({
  imports: [
    JotformModule,
    ConfigModule.forRoot({ isGlobal: true }), // Load biến môi trường toàn cục
  ],
  controllers: [AppController],
  providers: [AppService, MyLogger], // Đăng ký logger để inject
  exports: [MyLogger], // Xuất logger để module khác có thể sử dụng
})
export class AppModule {}
