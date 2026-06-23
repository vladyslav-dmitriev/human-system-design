import { Inject, Injectable } from '@nestjs/common';

import { PrismaService } from 'prisma/prisma.service';

import { Invoice } from './invoice.interface';

type UserInvoiceListItem = {
  id: Invoice['id'];
  number: Invoice['number'];
  amount: Invoice['amount'];
  currency: Invoice['currency'];
  status: Invoice['status'];
  pdfUrl: Invoice['pdfUrl'];
  createdAt: Invoice['createdAt'];
};

type CreateInvoiceData = Omit<Invoice, 'id'>;

export interface IInvoiceRepository {
  getUserInvoiceList(userId: string): Promise<UserInvoiceListItem[]>;
  updatePdfUrl(invoiceId: string, pdfUrl: string): Promise<void>;
  getLastInvoiceNumber(): Promise<{ number: Invoice['number'] } | null>;
  createInvoice(data: CreateInvoiceData): Promise<Invoice>;
}

@Injectable()
export class InvoiceRepository implements IInvoiceRepository {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async getUserInvoiceList(
    userId: string,
  ): ReturnType<IInvoiceRepository['getUserInvoiceList']> {
    return await this.prisma.invoice.findMany({
      where: {
        userId,
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 12,
      select: {
        id: true,
        number: true,
        amount: true,
        currency: true,
        status: true,
        pdfUrl: true,
        createdAt: true,
      },
    });
  }

  async updatePdfUrl(
    invoiceId: string,
    pdfUrl: string,
  ): ReturnType<IInvoiceRepository['updatePdfUrl']> {
    await this.prisma.invoice.update({
      where: { id: invoiceId },
      data: { pdfUrl },
    });
  }

  async getLastInvoiceNumber(): ReturnType<
    IInvoiceRepository['getLastInvoiceNumber']
  > {
    return await this.prisma.invoice.findFirst({
      orderBy: { createdAt: 'desc' },
      select: { number: true },
    });
  }

  async createInvoice(
    data: CreateInvoiceData,
  ): ReturnType<IInvoiceRepository['createInvoice']> {
    return this.prisma.invoice.create({
      data,
    });
  }
}
