import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Inject,
} from '@nestjs/common';

import { CaptchaService } from '../captcha.service';

@Injectable()
export class CaptchaGuard implements CanActivate {
  constructor(
    @Inject(CaptchaService) private readonly captchaService: CaptchaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();

    const token =
      request.body?.captchaToken || request.headers['x-captcha-token'];

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
