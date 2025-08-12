import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { MyLogger } from 'src/logger/logger';


async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Lấy instance MyLogger
  const logger = app.get(MyLogger);

  logger.log('Application starting...');

  await app.listen(3000);
}
bootstrap();
