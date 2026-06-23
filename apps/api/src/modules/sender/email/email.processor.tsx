import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { render } from 'react-email';
import VerificationEmail from 'emails/templates/verification-email';
import InvoiceEmail from 'emails/templates/invoice-email';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { QUEUE, QUEUE_JOB } from 'config/queue.config';
import { t } from 'emails/i18n';
import { EmailService } from './email.service';
import { ConfigService } from '@nestjs/config';

type SendVerificationEmailData = {
  email: string;
  token: string;
  locale: 'en' | 'uk';
};

type SendInvoiceEmailData = {
  email: string;
  pdfUrl: string;
  invoiceNumber: string;
  amount: number;
  currency: string;
  locale: 'uk' | 'en';
};

const VERIFICATION_EMAIL_SUBJECT_MAPPING = {
  uk: 'Підтвердьте ваш email',
  en: 'Confirm your email address',
};

const INVOICE_EMAIL_SUBJECT_MAPPING = {
  uk: 'Дякую за оплату',
  en: 'Thank you for payment',
};

@Processor(QUEUE.EmailQueue)
@Injectable()
export class EmailProcessor extends WorkerHost {
  private readonly logger = new Logger(EmailProcessor.name);

  constructor(
    @Inject(EmailService) private readonly emailService: EmailService,
    @Inject(ConfigService) private readonly configService: ConfigService,
  ) {
    super();
  }

  async process(job: Job): Promise<void> {
    if (job.name === QUEUE_JOB[QUEUE.EmailQueue].SendVerificationEmail) {
      return this.sendVerificationEmail(job.data as SendVerificationEmailData);
    }

    if (job.name === QUEUE_JOB[QUEUE.EmailQueue].SendInvoiceEmail) {
      return this.sendInvoiceEmail(job.data as SendInvoiceEmailData);
    }

    throw new Error(`Unknown job: ${job.name}`);
  }

  async sendVerificationEmail({
    email,
    token,
    locale,
  }: SendVerificationEmailData) {
    const clientUrl = this.configService.get<string>('CLIENT_URL');

    const html = await render(
      <VerificationEmail
        title={t('verification.title', locale)}
        body={t('verification.body', locale)}
        buttonText={t('verification.button', locale)}
        footer={t('verification.footer', locale)}
        confirmationLink={`${clientUrl}/verify-email?token=${token}`}
      />,
    );

    try {
      await this.emailService.sendEmail({
        from: 'onboarding@resend.dev',
        to: email,
        subject:
          VERIFICATION_EMAIL_SUBJECT_MAPPING[locale] ??
          VERIFICATION_EMAIL_SUBJECT_MAPPING.en,
        html,
      });

      this.logger.log(`Email успешно отправлен на ${email}`);
    } catch (error) {
      this.logger.error(`Ошибка отправки письма: ${error}`);
      throw error; // Бросаем ошибку, чтобы BullMQ сделал retry (повтор)
    }
  }

  async sendInvoiceEmail(data: SendInvoiceEmailData) {
    const { email, invoiceNumber, amount, currency, pdfUrl, locale } = data;

    const html = await render(
      <InvoiceEmail
        title={t('invoice.title', locale, { invoiceNumber })}
        amountText={t('invoice.amount', locale, {
          currency: currency,
          amount: (amount / 100).toFixed(2),
        })}
        viewLinkText={t('invoice.view_link', locale)}
        thankYouText={t('invoice.thank_you', locale)}
        pdfUrl={pdfUrl}
      />,
    );

    try {
      await this.emailService.sendEmail({
        from: 'onboarding@resend.dev',
        to: email,
        subject:
          INVOICE_EMAIL_SUBJECT_MAPPING[locale] ??
          INVOICE_EMAIL_SUBJECT_MAPPING.en,
        html,
      });
      this.logger.log(`Email успешно отправлен на ${email}`);
    } catch (error) {
      this.logger.error(`Ошибка отправки письма: ${error}`);
      throw error; // Бросаем ошибку, чтобы BullMQ сделал retry (повтор)
    }
  }
}
