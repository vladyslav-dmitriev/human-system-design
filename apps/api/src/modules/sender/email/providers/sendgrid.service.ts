import {
  Inject,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import SendGrid from '@sendgrid/mail';

import type { EmailMessage, IEmailService } from '../email.interface';

@Injectable()
export class SendGridService implements IEmailService {
  private readonly defaultFrom: string | undefined;

  constructor(
    @Inject(ConfigService) private readonly configService: ConfigService,
  ) {
    const apiKey = this.configService.get<string>('SENDGRID_API_KEY');

    if (!apiKey) {
      throw new Error('SENDGRID_API_KEY is missing');
    }

    // Проверяется при отправке: валидацию EMAIL_FROM в конфиге добавляет platform
    this.defaultFrom = this.configService.get<string>('EMAIL_FROM');
    SendGrid.setApiKey(apiKey);
  }

  // Отправитель из EMAIL_FROM, поле from сообщения его переопределяет
  async sendEmail({ from, to, subject, html }: EmailMessage) {
    const sender = from ?? this.defaultFrom;

    if (!sender) {
      throw new InternalServerErrorException('EMAIL_FROM is not configured');
    }

    try {
      await SendGrid.send({
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
