import { Module } from '@nestjs/common';
import { PdfService } from './pdf.service';
import { StorageModule } from '../storage/storage.module';
// import { setupQueue, registerQueue } from 'utils/queue';
// import { QUEUE } from 'config/queue.config';
import { PdfProcessor } from './pdf.processor';
import { InvoiceModule } from '../billing/invoice';

@Module({
  imports: [
    StorageModule,
    InvoiceModule,
    // ...setupQueue(QUEUE.PdfQueue),
    // ...registerQueue(QUEUE.EmailQueue),
  ],
  providers: [PdfService, PdfProcessor],
  exports: [PdfService],
})
export class PdfModule {}
