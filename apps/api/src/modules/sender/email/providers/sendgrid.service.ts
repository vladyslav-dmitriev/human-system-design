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
  constructor(
    @Inject(ConfigService) private readonly configService: ConfigService,
  ) {
    const apiKey = this.configService.get<string>('SENDGRID_API_KEY');

    if (!apiKey) {
      throw new Error('SENDGRID_API_KEY is missing');
    }

    SendGrid.setApiKey(apiKey);
  }

  // Отправитель пока зашит в провайдере, поле from из сообщения не используется
  async sendEmail({ to, subject, html }: EmailMessage) {
    try {
      await SendGrid.send({
        from: 'vladyslav.dmitriev@gmail.com',
        to,
        subject,
        html,
      });
    } catch {
      throw new InternalServerErrorException('Error sending email');
    }
  }
}
