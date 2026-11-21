import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';
import { Inject, Logger } from '@nestjs/common';
import type { Job } from 'bullmq';

import { QUEUE, QUEUE_JOB } from 'config/queue.config';
import { StorageService } from '../storage';
import { InvoiceRepository } from '../billing/invoice';
import { EmailService } from '../sender/email';

import { PdfService } from './pdf.service';

type CreatePdfInvoiceJob = {
  invoiceId: string;
  invoiceNumber: string;
  amount: number;
  currency: string;
  customerEmail: string;
  /** В Redis дата хранится строкой ISO */
  date: Date | string;
};

@Processor(QUEUE.PdfQueue, { concurrency: 1 })
export class PdfProcessor extends WorkerHost {
  private readonly logger = new Logger(PdfProcessor.name);

  constructor(
    @Inject(PdfService) private readonly pdfService: PdfService,
    @Inject(StorageService) private readonly storageService: StorageService,
    @Inject(InvoiceRepository)
    private readonly invoiceRepository: InvoiceRepository,
    @Inject(EmailService) private readonly emailService: EmailService,
  ) {
    super();
  }

  process(job: Job): Promise<unknown> {
    if (job.name === QUEUE_JOB[QUEUE.PdfQueue].CreatePdfInvoice) {
      return this.createPdfInvoice(job.data as CreatePdfInvoiceJob);
    }

    return Promise.reject(new Error(`Unknown job: ${job.name}`));
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job | undefined, error: Error) {
    this.logger.error(
      `Pdf job ${job?.id} failed, attempt ${job?.attemptsMade}/${job?.opts.attempts}: ${error.message}`,
    );
  }

  async createPdfInvoice(data: CreatePdfInvoiceJob) {
    const pdfBuffer = await this.pdfService.generatePdfBuffer({
      number: data.invoiceNumber,
      amount: data.amount / 100,
      customerEmail: data.customerEmail,
      date: new Date(data.date),
    });

    const pdfUrl = await this.storageService.upload({
      file: pdfBuffer,
      fileName: `${data.invoiceNumber}.pdf`,
      folder: 'invoices',
      contentType: 'application/pdf',
    });

    await this.invoiceRepository.updatePdfUrl(data.invoiceId, pdfUrl);

    if (data.customerEmail) {
      await this.emailService.sendInvoiceEmail({
        email: data.customerEmail,
        invoiceNumber: data.invoiceNumber,
        amount: data.amount,
        currency: data.currency,
        pdfUrl,
        locale: 'en',
      });
    }

    return { pdfUrl };
  }
}
