// src/logger/my-logger.ts
import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class MyLogger extends Logger {
  private readonly logFile: string;

  constructor() {
    super(MyLogger.name, { timestamp: true });
    const logsDir = path.join(process.cwd(), 'logs');
    if (!fs.existsSync(logsDir)) fs.mkdirSync(logsDir, { recursive: true });
    this.logFile = path.join(logsDir, 'app.log');
  }

  log(message: any, ...optionalParams: any[]) {
    super.log(message, ...optionalParams);
    this.writeToFile('LOG', message);
  }

  error(message: any, trace?: string, ...optionalParams: any[]) {
    super.error(message, trace, ...optionalParams);
    this.writeToFile('ERROR', `${message}${trace ? ' - ' + trace : ''}`);
  }

  warn(message: any, ...optionalParams: any[]) {
    super.warn(message, ...optionalParams);
    this.writeToFile('WARN', message);
  }

  private writeToFile(level: string, message: any) {
    const timestamp = new Date().toISOString();
    fs.appendFileSync(
      this.logFile,
      `[${timestamp}] [${level}] ${message}\n`,
      'utf8',
    );
  }
}
