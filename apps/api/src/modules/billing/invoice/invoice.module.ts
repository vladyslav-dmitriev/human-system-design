import { Module } from '@nestjs/common';
import { InvoiceRepository } from './invoice.repository';
import { InvoiceService } from './invoice.service';
import { InvoicesController } from './invoices.controller';
import { registerQueue } from 'utils/queue';
import { QUEUE } from 'config/queue.config';

@Module({
  imports: [...registerQueue(QUEUE.PdfQueue)],
  providers: [InvoiceRepository, InvoiceService],
  controllers: [InvoicesController],
  exports: [InvoiceRepository, InvoiceService],
})
export class InvoiceModule {}
