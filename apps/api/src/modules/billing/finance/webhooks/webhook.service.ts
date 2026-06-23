import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { PaymentHandler } from './payment.handler';
import { PaymentsService } from '../../payments';

@Injectable()
export class WebhookService {
  constructor(
    @Inject(PaymentHandler)
    private readonly paymentHandler: PaymentHandler,
    @Inject(PaymentsService) private readonly paymentsService: PaymentsService,
  ) {}

  async execute(rawBody: Buffer, signature: string) {
    let event: any;

    try {
      event = await this.paymentsService.constructEvent(rawBody, signature);
    } catch (error) {
      throw new BadRequestException(`Webhook Error: ${error}`);
    }

    console.log('event.type', event.type);

    switch (event.type) {
      case 'invoice.paid': {
        // NOTE: SUBSCRIPTION HANDLER
        await this.paymentHandler.handleSubscriptionPurchase(event);
        break;
      }

      case 'payment_intent.succeeded': {
        // NOTE: ONE-PAYMENT INTENT HANDLER
        const paymentIntent = event.data.object;

        if (paymentIntent.metadata?.type === 'one_time') {
          await this.paymentHandler.handleOneTimePurchase(event);
        } else {
          await this.paymentHandler.handleSubscriptionUpgrade(event);
        }

        break;
      }
    }
  }
}
