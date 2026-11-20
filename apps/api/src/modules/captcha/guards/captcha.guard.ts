import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Inject,
} from '@nestjs/common';
import type { Request } from 'express';

import { CaptchaService } from '../captcha.service';

@Injectable()
export class CaptchaGuard implements CanActivate {
  constructor(
    @Inject(CaptchaService) private readonly captchaService: CaptchaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const body = request.body as { captchaToken?: string } | undefined;
    const headerToken = request.headers['x-captcha-token'];

    const token =
      body?.captchaToken ||
      (Array.isArray(headerToken) ? headerToken[0] : headerToken);

    if (!token) {
      throw new ForbiddenException('Captcha token is missing');
    }

    const isValid = await this.captchaService.verify(token, request.ip);

    if (!isValid) {
      throw new ForbiddenException('Invalid captcha token');
    }

    return true;
  }
}
