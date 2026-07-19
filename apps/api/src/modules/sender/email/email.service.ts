import { Inject, Injectable } from '@nestjs/common';
// import { InjectQueue } from '@nestjs/bullmq';
// import { Queue } from 'bullmq';
// import { QUEUE, QUEUE_JOB } from 'config/queue.config';
import type { IEmailService } from './email.interface';

@Injectable()
export class EmailService implements IEmailService {
  constructor(
    @Inject('EMAIL_PROVIDER') private readonly emailProvider: IEmailService,
    // @InjectQueue(QUEUE.EmailQueue) private readonly emailQueue: Queue,
  ) {}

  async sendEmail({ from, to, subject, html }) {
    // await this.emailProvider.sendEmail({
    //   from,
    //   to,
    //   subject,
    //   html,
    // });
  }

  async sendVerificationEmail(dto: any, locale: 'uk' | 'en'): Promise<void> {
    const { email, token } = dto;

    // await this.emailQueue.add(
    //   QUEUE_JOB[QUEUE.EmailQueue].SendVerificationEmail,
    //   {
    //     data: {
    //       email,
    //       token,
    //       locale,
    //     },
    //   },
    // );
  }

  async sendInvoiceEmail({
    email,
    locale,
    invoiceNumber,
    amount,
    currency,
    pdfUrl,
  }: {
    email: string;
    invoiceNumber: string;
    amount: number;
    currency: string;
    pdfUrl: string;
    locale: 'uk' | 'en';
  }): Promise<void> {
    // await this.emailQueue.add(QUEUE_JOB[QUEUE.EmailQueue].SendInvoiceEmail, {
    //   data: {
    //     email,
    //     invoiceNumber,
    //     amount,
    //     currency,
    //     pdfUrl,
    //     locale,
    //   },
    // });
  }
}
