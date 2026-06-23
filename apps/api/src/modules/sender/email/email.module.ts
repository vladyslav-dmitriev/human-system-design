import { Module } from '@nestjs/common';
import { EmailsController } from './emails.controller';
import { EmailService } from './email.service';

import { EmailProcessor } from './email.processor';
import { QUEUE } from 'config/queue.config';
import { registerQueue, setupQueue } from 'utils/queue';
// import { RecendService } from './providers/recend.service';
import { SendGridService } from './providers/sendgrid.service';

@Module({
  imports: [...setupQueue(QUEUE.EmailQueue), ...registerQueue(QUEUE.PdfQueue)],
  providers: [
    {
      provide: 'EMAIL_PROVIDER',
      useClass: SendGridService,
      // useClass: RecendService,
    },
    EmailService,
    EmailProcessor,
  ],
  controllers: [EmailsController],
  exports: [EmailService],
})
export class EmailModule {}
