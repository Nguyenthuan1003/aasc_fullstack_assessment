import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class LoggerService extends Logger {
  private logFile = path.join(process.cwd(), 'logs/bitrix.log');

  log(message: string, context?: string) {
    super.log(message, context);
    this.writeToFile('LOG', message, context);
  }

  warn(message: string, context?: string) {
    super.warn(message, context);
    this.writeToFile('WARN', message, context);
  }

  error(message: string, trace?: string, context?: string) {
    super.error(message, trace, context);
    this.writeToFile(
      'ERROR',
      message + (trace ? ` | trace: ${trace}` : ''),
      context,
    );
  }

  private writeToFile(level: string, message: string, context?: string) {
    const line = `[${new Date().toISOString()}] [${level}] ${context ? context + ' - ' : ''}${message}\n`;
    fs.mkdirSync(path.dirname(this.logFile), { recursive: true });
    fs.appendFileSync(this.logFile, line);
  }
}
