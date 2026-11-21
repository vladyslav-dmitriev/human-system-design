import { Module } from '@nestjs/common';
import { PdfService } from './pdf.service';
import { StorageModule } from '../storage/storage.module';
import { registerQueue } from 'utils/queue';
import { QUEUE } from 'config/queue.config';
import { EmailModule } from '../sender/email';
import { PdfProcessor } from './pdf.processor';
import { InvoiceModule } from '../billing/invoice';

@Module({
  imports: [
    StorageModule,
    InvoiceModule,
    EmailModule,
    registerQueue(QUEUE.PdfQueue),
  ],
  providers: [PdfService, PdfProcessor],
  exports: [PdfService],
})
export class PdfModule {}
