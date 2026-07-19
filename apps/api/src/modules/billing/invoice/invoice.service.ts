// import { Queue } from 'bullmq';
// import { InjectQueue } from '@nestjs/bullmq';
import { Inject, Injectable } from '@nestjs/common';

// import { QUEUE, QUEUE_JOB } from 'config/queue.config';
import { Nullable } from 'types';

import { InvoiceRepository } from './invoice.repository';

@Injectable()
export class InvoiceService {
  constructor(
    @Inject(InvoiceRepository)
    private readonly invoiceRepository: InvoiceRepository,
    // @InjectQueue(QUEUE.PdfQueue) private readonly pdfQueue: Queue,
  ) {}

  async getUserInvoiceList(userId: string) {
    return this.invoiceRepository.getUserInvoiceList(userId);
  }

  async createInvoice({
    userId,
    stripeCustomerId,
    stripePaymentIntentId,
    customerEmail,
    amount,
    currency,
    metadata,
  }: {
    userId: string;
    stripeCustomerId: string;
    stripePaymentIntentId: string;
    customerEmail: string;
    amount: number;
    currency: string;
    metadata: Nullable<any>;
  }) {
    const invoiceNumber = await this.generateUniqueInvoiceNumber();

    const invoice = await this.invoiceRepository.createInvoice({
      number: invoiceNumber,
      stripePaymentIntentId,
      stripeCustomerId,
      userId,
      amount,
      currency,
      status: 'paid',
      pdfUrl: null,
      metadata: metadata!,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await this.requestPdfInvoiceGeneration({
      invoiceId: invoice.id,
      invoiceNumber,
      amount,
      currency,
      customerEmail,
      date: invoice.createdAt,
    });
  }

  private async requestPdfInvoiceGeneration({
    invoiceId,
    invoiceNumber,
    amount,
    currency,
    customerEmail,
    date,
  }: {
    invoiceId: string;
    invoiceNumber: string;
    amount: number;
    currency: string;
    customerEmail: string;
    date: Date;
  }) {
    // await this.pdfQueue.add(QUEUE_JOB[QUEUE.PdfQueue].CreatePdfInvoice, {
    //   invoiceId,
    //   invoiceNumber,
    //   amount,
    //   currency,
    //   customerEmail,
    //   date,
    // });
  }

  private async generateUniqueInvoiceNumber(): Promise<string> {
    const lastInvoice = await this.invoiceRepository.getLastInvoiceNumber();

    let nextNumber = 1001;

    if (lastInvoice && lastInvoice.number) {
      const parts = lastInvoice.number.split('-');
      const lastNum = parseInt(parts[parts.length - 1], 10);

      if (!isNaN(lastNum)) {
        nextNumber = lastNum + 1;
      }
    }

    return `INV-${new Date().getFullYear()}-${nextNumber}`;
  }
}
