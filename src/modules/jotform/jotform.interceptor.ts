/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
// multipart-formdata.interceptor.ts
import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  BadRequestException,
} from '@nestjs/common';
import { Observable } from 'rxjs';

import multer from 'multer';
const upload = multer();

@Injectable()
export class MultipartFormDataInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const ctx = context.switchToHttp();
    const req = ctx.getRequest();

    return new Promise((resolve, reject) => {
      upload.any()(req, undefined, (err: any) => {
        if (err) {
          reject(new BadRequestException('Error parsing multipart/form-data'));
          return;
        }
        resolve(next.handle());
      });
    }) as unknown as Observable<any>;
  }
}
