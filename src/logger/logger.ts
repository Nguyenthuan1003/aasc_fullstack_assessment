import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

/**
 * MyLogger kế thừa Logger mặc định của NestJS
 * - Ghi log ra console theo chuẩn NestJS
 * - Đồng thời ghi log vào file logs/app.log để lưu trữ lâu dài
 */
@Injectable()
export class MyLogger extends Logger {
  private readonly logFile: string;

  constructor() {
    // Gọi super với tên logger và bật timestamp mặc định
    super(MyLogger.name, { timestamp: true });

    // Đường dẫn thư mục logs nằm trong root project
    const logsDir = path.join(process.cwd(), 'logs');

    // Tạo thư mục logs nếu chưa tồn tại
    if (!fs.existsSync(logsDir)) fs.mkdirSync(logsDir, { recursive: true });

    // File log lưu tại logs/app.log
    this.logFile = path.join(logsDir, 'app.log');
  }

  /**
   * Ghi log thông thường
   * - Ghi ra console qua super.log
   * - Ghi vào file logs/app.log
   */
  log(message: any, ...optionalParams: any[]) {
    super.log(message, ...optionalParams);
    this.writeToFile('LOG', message);
  }

  /**
   * Ghi log lỗi
   * - Ghi ra console qua super.error
   * - Ghi vào file logs/app.log với level ERROR
   */
  error(message: any, trace?: string, ...optionalParams: any[]) {
    super.error(message, trace, ...optionalParams);
    this.writeToFile('ERROR', `${message}${trace ? ' - ' + trace : ''}`);
  }

  /**
   * Ghi log cảnh báo
   * - Ghi ra console qua super.warn
   * - Ghi vào file logs/app.log với level WARN
   */
  warn(message: any, ...optionalParams: any[]) {
    super.warn(message, ...optionalParams);
    this.writeToFile('WARN', message);
  }

  /**
   * Hàm phụ trợ ghi nội dung log vào file
   * - Format log: [timestamp] [level] message
   */
  private writeToFile(level: string, message: any) {
    const timestamp = new Date().toISOString();
    fs.appendFileSync(
      this.logFile,
      `[${timestamp}] [${level}] ${message}\n`,
      'utf8',
    );
  }
}
