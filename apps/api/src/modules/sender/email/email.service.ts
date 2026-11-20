import { Inject, Injectable } from '@nestjs/common';
// import { InjectQueue } from '@nestjs/bullmq';
// import { Queue } from 'bullmq';
// import { QUEUE, QUEUE_JOB } from 'config/queue.config';
import type { EmailMessage, IEmailService } from './email.interface';

type Locale = 'uk' | 'en';

export type SendVerificationEmailParams = { email: string; token: string };

export type SendInvoiceEmailParams = {
  email: string;
  invoiceNumber: string;
  amount: number;
  currency: string;
  pdfUrl: string;
  locale: Locale;
};

/**
 * Очередь писем (BullMQ) сейчас отключена, поэтому методы — заглушки,
 * которые ничего не отправляют. Код постановки в очередь оставлен в комментариях.
 */
@Injectable()
export class EmailService implements IEmailService {
  constructor(
    @Inject('EMAIL_PROVIDER') private readonly emailProvider: IEmailService,
    // @InjectQueue(QUEUE.EmailQueue) private readonly emailQueue: Queue,
  ) {}

  sendEmail(_message: EmailMessage): Promise<void> {
    // await this.emailProvider.sendEmail(message);
    return Promise.resolve();
  }

  sendVerificationEmail(
    _params: SendVerificationEmailParams,
    _locale: Locale,
  ): Promise<void> {
    // await this.emailQueue.add(
    //   QUEUE_JOB[QUEUE.EmailQueue].SendVerificationEmail,
    //   { data: { email, token, locale } },
    // );
    return Promise.resolve();
  }

  sendInvoiceEmail(_params: SendInvoiceEmailParams): Promise<void> {
    // await this.emailQueue.add(QUEUE_JOB[QUEUE.EmailQueue].SendInvoiceEmail, {
    //   data: { email, invoiceNumber, amount, currency, pdfUrl, locale },
    // });
    return Promise.resolve();
  }
}
