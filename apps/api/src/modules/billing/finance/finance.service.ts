import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { PaymentsService } from '../payments';
import { UserRepository } from '../../user';
import { CheckoutCreateBodyDto, PaymentIntentGetParamsDto } from './dto';
import { FinanceRepository } from './finance.repository';
import { FinanceMapper } from './finance.mapper';

@Injectable()
export class FinanceService {
  constructor(
    @Inject(UserRepository) private readonly userRepository: UserRepository,
    @Inject(FinanceRepository)
    private readonly financeRepository: FinanceRepository,
    @Inject(PaymentsService) private readonly paymentsService: PaymentsService,
    @Inject(ConfigService) private readonly configService: ConfigService,
  ) {}

  async getUserBilling(userId: string) {
    const rawData = await this.financeRepository.getUserBilling(userId);

    if (rawData?.userBillingProfile) {
      return FinanceMapper.toResponse(rawData);
    }

    const user = await this.userRepository.getUserById(userId);

    if (!user) {
      throw new Error('User not found');
    }

    const billingProviderUser =
      await this.paymentsService.createPaymentCustomer(user.email);

    await this.financeRepository.createUserBilling({
      userId,
      stripeCustomerId: billingProviderUser.id,
    });

    const createdRawData = await this.financeRepository.getUserBilling(userId);

    if (!createdRawData) {
      throw new Error('Error');
    }

    return FinanceMapper.toResponse(createdRawData);
  }

  async createCheckout(userId: string, dto: CheckoutCreateBodyDto) {
    const { priceId, type } = dto;

    if (type === 'subscription') {
      const res = await this.createSubscription(userId, priceId);

      return res;
    }

    if (type === 'one-payment') {
      return await this.createPaymentIntent(userId, priceId);
    }
  }

  async createSubscription(userId: string, priceId: string) {
    const billingProfile = await this.getUserBilling(userId);

    const stripeCustomerId = billingProfile?.billing.stripeCustomerId;

    if (!stripeCustomerId) {
      throw new Error('User not found');
    }

    const price = await this.paymentsService.getPrice(priceId);

    const productName = (price.product as any).name;

    const subscription = await this.paymentsService.createSubscription(
      stripeCustomerId,
      priceId,
      productName,
    );

    if (!subscription?.latest_invoice) {
      throw new Error('Subscription not found');
    }

    const invoice = subscription.latest_invoice;

    if (typeof invoice === 'string') {
      throw new Error('Invoice not found');
    }

    const clientSecret = invoice.confirmation_secret?.client_secret;
    const amount = invoice.total;
    const currency = subscription.currency;

    return {
      clientSecret,
      amount,
      currency,
      productName,
    };
  }

  async createPaymentIntent(userId: string, priceId: string) {
    const billingProfile = await this.getUserBilling(userId);

    const stripeCustomerId = billingProfile?.billing.stripeCustomerId;

    if (!stripeCustomerId) {
      throw new Error('User not found');
    }

    const price = await this.paymentsService.getPrice(priceId);

    const productName = (price.product as any).name;

    const paymentIntent = await this.paymentsService.createPaymentIntent({
      stripeCustomerId,
      currency: 'usd',
      amount: price.unit_amount,
      metadata: {
        type: 'one_time',
        name: productName,
        priceId: price.id,
        productId: price.product.id,
      },
    });

    if (!paymentIntent) {
      throw new Error('Payment Intent not found');
    }

    return {
      clientSecret: paymentIntent.client_secret,
      amount: price.unit_amount,
      currency: price.currency,
      productName,
    };
  }

  async getPaymentIntent(params: PaymentIntentGetParamsDto) {
    const paymentIntent = await this.paymentsService.getPaymentIntent(
      params.paymentIntentId,
    );

    if (paymentIntent.status !== 'succeeded') {
      throw new BadRequestException('Payment not successful');
    }

    return {
      amount: paymentIntent.amount,
      currency: paymentIntent.currency,
      status: paymentIntent.status,
      customer: paymentIntent.customer,
      metadata: isEmpty(paymentIntent.metadata)
        ? {
            name: 'Premium',
            type: 'subscription',
          }
        : paymentIntent.metadata,
    };
  }

  async createPortalSession(userId: string) {
    const frontendUrl = this.configService.get<string>('CLIENT_URL');

    const user = await this.userRepository.getUserById(userId);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    let stripeCustomerId = user.userBillingProfile.stripeCustomerId;

    if (!stripeCustomerId) {
      throw new BadRequestException(`Don't have stripe customer id`);
    }

    const session = await this.paymentsService.createBillingPortal(
      stripeCustomerId,
      `${frontendUrl}/billing`,
    );

    return {
      url: session.url,
    };
  }
}

function isEmpty(obj) {
  for (const prop in obj) {
    // @ts-ignore
    if (Object.hasOwn(obj, prop)) {
      return false;
    }
  }

  return true;
}
