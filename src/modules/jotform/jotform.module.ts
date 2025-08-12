import { Module } from '@nestjs/common';
import { JotformController } from './jotform.controller';
import { JotformService } from './jotform.service';
import { HttpModule } from '@nestjs/axios';

@Module({
  imports: [HttpModule],
  controllers: [JotformController],
  providers: [JotformService],
})
export class JotformModule {}
