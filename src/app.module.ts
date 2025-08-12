import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { JotformModule } from './modules/jotform/jotform.module';
import { ConfigModule } from '@nestjs/config';
import { MyLogger } from './logger/logger';

@Module({
  imports: [JotformModule, ConfigModule.forRoot({ isGlobal: true })],
  controllers: [AppController],
  providers: [AppService, MyLogger],
  exports: [MyLogger],
})
export class AppModule {}
