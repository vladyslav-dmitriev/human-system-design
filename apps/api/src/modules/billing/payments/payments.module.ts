import { Module } from '@nestjs/common';

import { PaymentsService } from './payments.service';
import { StripeProvider } from './providers/stripe.provider';

@Module({
  providers: [
    {
      provide: 'PAYMENT_PROVIDER',
      useClass: StripeProvider,
    },
    PaymentsService,
  ],
  exports: [PaymentsService],
})
export class PaymentsModule {}
