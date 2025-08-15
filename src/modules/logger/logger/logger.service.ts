import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class LoggerService extends Logger {
  // ==== Log file path ====
  // Gghi log ra file logs/bitrix.log trong folder project root
  private logFile = path.join(process.cwd(), 'logs/bitrix.log');

  // ==== Ghi log level LOG ====
  // Ghi ra console và file
  log(message: string, context?: string) {
    super.log(message, context); // Ghi ra console theo NestJS Logger
    this.writeToFile('LOG', message, context); // Ghi ra file
  }

  // ==== Ghi log level WARN ====
  warn(message: string, context?: string) {
    super.warn(message, context);
    this.writeToFile('WARN', message, context);
  }

  // ==== Ghi log level ERROR ====
  // Trace là stack trace, context là tên class/module
  error(message: string, trace?: string, context?: string) {
    super.error(message, trace, context);
    this.writeToFile(
      'ERROR',
      message + (trace ? ` | trace: ${trace}` : ''),
      context,
    );
  }

  // ==== Hàm private ghi log ra file ====
  private writeToFile(level: string, message: string, context?: string) {
    // Format: [ISO Date] [LEVEL] Context - message
    const line = `[${new Date().toISOString()}] [${level}] ${context ? context + ' - ' : ''}${message}\n`;

    // Tạo folder logs nếu chưa có
    fs.mkdirSync(path.dirname(this.logFile), { recursive: true });

    // Append log vào file
    fs.appendFileSync(this.logFile, line);
  }
}
