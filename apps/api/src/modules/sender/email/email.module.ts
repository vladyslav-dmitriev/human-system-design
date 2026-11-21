import { Module } from '@nestjs/common';
import { EmailsController } from './emails.controller';
import { EmailService } from './email.service';
import { EmailVerificationService } from './email-verification.service';

import { EmailProcessor } from './email.processor';
// import { QUEUE } from 'config/queue.config';
// import { registerQueue, setupQueue } from 'utils/queue';
// import { RecendService } from './providers/recend.service';
import { SendGridService } from './providers/sendgrid.service';
import { UserModule } from '../../user';

@Module({
  // imports: [...setupQueue(QUEUE.EmailQueue), ...registerQueue(QUEUE.PdfQueue)],
  imports: [UserModule],
  providers: [
    {
      provide: 'EMAIL_PROVIDER',
      useClass: SendGridService,
      // useClass: RecendService,
    },
    EmailService,
    EmailVerificationService,
    EmailProcessor,
  ],
  controllers: [EmailsController],
  exports: [EmailService, EmailVerificationService],
})
export class EmailModule {}
