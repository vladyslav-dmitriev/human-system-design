import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import Stripe from 'stripe';

import { UserRepository } from '../../user';
import { PaymentsService } from '../payments';
import { SubscriptionRenewBodyDto, SubscriptionUpgradeBodyDto } from './dto';
import { SubscriptionRepository } from './subscription.repository';

export interface Plan {
  priceId: string;
  productId: string;
  name: string;
  description: string | null;
  amount: number;
  currency: string;
  interval: string;
}

@Injectable()
export class SubscriptionService {
  constructor(
    @Inject(UserRepository) private readonly userRepository: UserRepository,
    @Inject(PaymentsService) private readonly paymentsService: PaymentsService,
    @Inject(SubscriptionRepository)
    private readonly subscriptionRepository: SubscriptionRepository,
  ) {}

  async setAutoRenew(userId: string, dto: SubscriptionRenewBodyDto) {
    const user = await this.userRepository.getUserById(userId);

    if (!user?.subscription.stripeSubscriptionId) {
      throw new NotFoundException('Active subscription not found');
    }

    await this.paymentsService.updateSubscription(
      user.subscription.stripeSubscriptionId,
      dto.autoRenew,
    );

    await this.subscriptionRepository.changeAutoRenew(
      user.subscription.stripeSubscriptionId,
      dto.autoRenew,
    );

    return {
      success: true,
      autoRenew: dto.autoRenew,
    };
  }

  async upgradeSubscription(userId: string, dto: SubscriptionUpgradeBodyDto) {
    const { type, priceId } = dto;

    const user = await this.userRepository.getUserById(userId);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const subscriptionId = user.subscription.stripeSubscriptionId;

    if (!subscriptionId) {
      throw new NotFoundException('Subscription id not found');
    }

    const subscription =
      await this.paymentsService.getSubscription(subscriptionId);

    if (!subscription) {
      throw new NotFoundException('Subscription not found');
    }

    const price = await this.paymentsService.getPrice(priceId);

    const productName = (price.product as Stripe.Product).name;

    const id = subscription.items.data[0].id;

    const invoice = await this.paymentsService.createPaymentInvoicePreview(
      subscription.customer as string,
      subscriptionId,
      priceId,
      id,
    );

    if (type === 'check') {
      return {
        clientSecret: null,
        amount: invoice.amount_due,
        currency: invoice.currency,
        productName,
      };
    }

    const paymentIntent = await this.paymentsService.createPaymentIntent({
      amount: invoice.amount_due,
      currency: invoice.currency,
      stripeCustomerId: invoice.customer as string,
      metadata: {
        name: productName,
        type: 'subscription',
        subscriptionId,
        priceId,
      },
    });

    return {
      clientSecret: paymentIntent.client_secret,
      amount: invoice.amount_due,
      currency: invoice.currency,
      productName,
    };
  }
}
