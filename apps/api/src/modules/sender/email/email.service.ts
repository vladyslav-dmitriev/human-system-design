import { createHash } from 'crypto';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import type { Queue } from 'bullmq';
import type Redis from 'ioredis';

import { QUEUE, QUEUE_JOB } from 'config/queue.config';
import { REDIS_CLIENT } from '../../redis';
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

/** Повторный запрос письма подтверждения для того же адреса в этом окне не ставится в очередь. */
export const VERIFICATION_EMAIL_COOLDOWN_SECONDS = 60;

export const verificationCooldownKey = (email: string) =>
  `email-verification-sent:${createHash('sha256').update(email).digest('hex')}`;

/**
 * Письма уходят через очередь BullMQ (`EmailProcessor` рендерит шаблон и вызывает
 * провайдера с ретраями). `sendEmail` отправляет сразу и нужен только процессору.
 */
@Injectable()
export class EmailService implements IEmailService {
  private readonly logger = new Logger(EmailService.name);

  constructor(
    @Inject('EMAIL_PROVIDER') private readonly emailProvider: IEmailService,
    @InjectQueue(QUEUE.EmailQueue) private readonly emailQueue: Queue,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
  ) {}

  sendEmail(message: EmailMessage): Promise<void> {
    return this.emailProvider.sendEmail(message);
  }

  /**
   * Дубли гасятся окном `VERIFICATION_EMAIL_COOLDOWN_SECONDS` на адрес
   * (регистрация, смена email и запрос web приходят почти одновременно).
   */
  async sendVerificationEmail(
    { email, token }: SendVerificationEmailParams,
    locale: Locale,
  ): Promise<void> {
    const key = verificationCooldownKey(email);
    const claimed = await this.redis.set(
      key,
      '1',
      'EX',
      VERIFICATION_EMAIL_COOLDOWN_SECONDS,
      'NX',
    );

    if (claimed === null) {
      this.logger.log('Verification email skipped: sent recently');

      return;
    }

    try {
      await this.emailQueue.add(
        QUEUE_JOB[QUEUE.EmailQueue].SendVerificationEmail,
        { email, token, locale },
        { removeOnComplete: true },
      );
    } catch (error) {
      await this.redis.del(key).catch(() => undefined);
      throw error;
    }
  }

  async sendInvoiceEmail({
    email,
    invoiceNumber,
    amount,
    currency,
    pdfUrl,
    locale,
  }: SendInvoiceEmailParams): Promise<void> {
    await this.emailQueue.add(
      QUEUE_JOB[QUEUE.EmailQueue].SendInvoiceEmail,
      { email, invoiceNumber, amount, currency, pdfUrl, locale },
      // Один номер счёта: одно письмо, повторная постановка игнорируется
      { jobId: `invoice-email-${invoiceNumber}` },
    );
  }
}
