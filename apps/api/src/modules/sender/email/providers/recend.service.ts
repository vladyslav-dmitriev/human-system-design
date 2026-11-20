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

  constructor(
    @Inject(ConfigService) private readonly configService: ConfigService,
  ) {
    const apiKey = this.configService.get<string>('RESEND_API_KEY');

    if (!apiKey) {
      throw new Error('RESEND_API_KEY is not defined');
    }

    this.resend = new Resend(apiKey);
  }

  // Отправитель пока зашит в провайдере, поле from из сообщения не используется
  async sendEmail({ to, subject, html }: EmailMessage) {
    try {
      await this.resend.emails.send({
        from: 'onboarding@resend.dev',
        to,
        subject,
        html,
      });
    } catch {
      throw new InternalServerErrorException('Error sending email');
    }
  }
}
