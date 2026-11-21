import {
  Inject,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';

import type { EmailMessage, IEmailService } from '../email.interface';

@Injectable()
export class RecendService implements IEmailService {
  private readonly resend: Resend;
  private readonly defaultFrom: string | undefined;

  constructor(
    @Inject(ConfigService) private readonly configService: ConfigService,
  ) {
    const apiKey = this.configService.get<string>('RESEND_API_KEY');

    if (!apiKey) {
      throw new Error('RESEND_API_KEY is not defined');
    }

    // Проверяется при отправке: валидацию EMAIL_FROM в конфиге добавляет platform
    this.defaultFrom = this.configService.get<string>('EMAIL_FROM');
    this.resend = new Resend(apiKey);
  }

  // Отправитель из EMAIL_FROM, поле from сообщения его переопределяет
  async sendEmail({ from, to, subject, html }: EmailMessage) {
    const sender = from ?? this.defaultFrom;

    if (!sender) {
      throw new InternalServerErrorException('EMAIL_FROM is not configured');
    }

    try {
      await this.resend.emails.send({
        from: sender,
        to,
        subject,
        html,
      });
    } catch {
      throw new InternalServerErrorException('Error sending email');
    }
  }
}
