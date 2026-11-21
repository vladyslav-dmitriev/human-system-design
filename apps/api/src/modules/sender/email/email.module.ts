import { Module, forwardRef } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { QUEUE } from 'config/queue.config';
import { registerQueue } from 'utils/queue';
import { EmailsController } from './emails.controller';
import { EmailService } from './email.service';
import { EmailVerificationService } from './email-verification.service';
import { EmailProcessor } from './email.processor';
import { RecendService } from './providers/recend.service';
import { SendGridService } from './providers/sendgrid.service';
import { UserModule } from '../../user';

/** Провайдер писем из конфига: `EMAIL_PROVIDER=sendgrid` (по умолчанию) или `resend`. */
export const createEmailProvider = (configService: ConfigService) =>
  configService.get<string>('EMAIL_PROVIDER') === 'resend'
    ? new RecendService(configService)
    : new SendGridService(configService);

@Module({
  imports: [registerQueue(QUEUE.EmailQueue), forwardRef(() => UserModule)],
  providers: [
    {
      provide: 'EMAIL_PROVIDER',
      useFactory: createEmailProvider,
      inject: [ConfigService],
    },
    EmailService,
    EmailVerificationService,
    EmailProcessor,
  ],
  controllers: [EmailsController],
  exports: [EmailService, EmailVerificationService],
})
export class EmailModule {}
