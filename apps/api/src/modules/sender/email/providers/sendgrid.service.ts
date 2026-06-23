import {
  Inject,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import SendGrid from '@sendgrid/mail';

import type { IEmailService } from '../email.interface';

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

  async sendEmail({ from, to, subject, html }) {
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
