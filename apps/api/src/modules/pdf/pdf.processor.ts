import { InjectQueue, Processor, WorkerHost } from '@nestjs/bullmq';
import { Inject } from '@nestjs/common';
// import { Job, Queue } from 'bullmq';

// import { QUEUE, QUEUE_JOB } from 'config/queue.config';
import { StorageService } from '../storage';
import { InvoiceRepository } from '../billing/invoice';

import { PdfService } from './pdf.service';

type CreatePdfInvoiceJob = {
  invoiceId: string;
  invoiceNumber: string;
  amount: number;
  currency: string;
  customerEmail: string;
  date: Date;
};

// @Processor(QUEUE.PdfQueue, { concurrency: 1 })
export class PdfProcessor extends WorkerHost {
  constructor(
    @Inject(PdfService) private readonly pdfService: PdfService,
    @Inject(StorageService) private readonly storageService: StorageService,
    @Inject(InvoiceRepository)
    private readonly invoiceRepository: InvoiceRepository,
    // @InjectQueue(QUEUE.EmailQueue) private readonly emailQueue: Queue,
  ) {
    super();
  }

  async process(job: Job): Promise<any> {
    // if (job.name === QUEUE_JOB[QUEUE.PdfQueue].CreatePdfInvoice) {
    //   return this.createPdfInvoice(job.data as CreatePdfInvoiceJob);
    // }

    throw new Error(`Unknown job: ${job.name}`);
  }

  async createPdfInvoice(data: CreatePdfInvoiceJob): Promise<any> {
    const pdfBuffer = await this.pdfService.generatePdfBuffer({
      number: data.invoiceNumber,
      amount: data.amount / 100,
      customerEmail: data.customerEmail,
      date: data.date,
    });

    const pdfUrl = await this.storageService.upload({
      file: pdfBuffer,
      fileName: `${data.invoiceNumber}.pdf`,
      folder: 'invoices',
      contentType: 'application/pdf',
    });

    await this.invoiceRepository.updatePdfUrl(data.invoiceId, pdfUrl);

    // await this.emailQueue.add(QUEUE_JOB[QUEUE.EmailQueue].SendInvoiceEmail, {
    //   email: data.customerEmail,
    //   invoiceNumber: data.invoiceNumber,
    //   amount: data.amount,
    //   currency: data.currency,
    //   pdfUrl,
    //   locale: 'en',
    // });

    return { pdfUrl };
  }
}
