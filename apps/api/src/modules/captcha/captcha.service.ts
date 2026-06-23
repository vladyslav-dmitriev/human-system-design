import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

const THRESHOLD = 0.5;

@Injectable()
export class CaptchaService {
  private readonly logger = new Logger(CaptchaService.name);
  private readonly GOOGLE_CAPTCHA_SECRET_KEY: string;
  private readonly VERIFY_URL =
    'https://www.google.com/recaptcha/api/siteverify';

  constructor(
    @Inject(ConfigService) private readonly configService: ConfigService,
  ) {
    const apiKey = this.configService.get<string>('GOOGLE_CAPTCHA_SECRET_KEY');

    if (!apiKey) {
      throw new Error('GOOGLE_CAPTCHA_SECRET_KEY is not defined');
    }

    this.GOOGLE_CAPTCHA_SECRET_KEY = apiKey;
  }

  async verify(captchaToken: string, remoteIp?: string): Promise<boolean> {
    try {
      const params = new URLSearchParams();

      params.append('secret', this.GOOGLE_CAPTCHA_SECRET_KEY);
      params.append('response', captchaToken);
      params.append('remoteip', remoteIp ?? '');

      const response = await fetch(this.VERIFY_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params.toString(),
      });

      const data = await response.json();

      return data.success && data.score >= THRESHOLD;
    } catch (error) {
      this.logger.error('Error connecting to Cloudflare API', error.stack);
      return false;
    }
  }
}
