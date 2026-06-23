import { Module } from '@nestjs/common';

import { QUEUE } from 'config/queue.config';

import { FinanceController } from './finance.controller';
import { WebhookService } from './webhooks/webhook.service';
import { FinanceService } from './finance.service';
import { PaymentHandler } from './webhooks/payment.handler';
import { PdfModule } from '../../pdf';
import { UserModule } from '../../user';
import { registerQueue, setupQueue } from 'utils/queue';
import { PaymentProcessor } from './webhooks/payment.processes';

import { InvoiceModule } from '../invoice';
import { PaymentsModule } from '../payments';
import { FeatureModule } from '../feature';
import { SubscriptionModule } from '../subscription';
import { FinanceRepository } from './finance.repository';
import { PaymentMethodModule } from '../payment-method';

@Module({
  imports: [
    PdfModule,
    InvoiceModule,
    PaymentsModule,
    UserModule,
    FeatureModule,
    SubscriptionModule,
    PaymentMethodModule,
    ...setupQueue(QUEUE.PaymentQueue),
    ...registerQueue(QUEUE.PdfQueue),
  ],
  providers: [
    FinanceService,
    FinanceRepository,
    WebhookService,
    PaymentHandler,
    PaymentProcessor,
  ],
  controllers: [FinanceController],
  exports: [FinanceService],
})
export class FinanceModule {}
