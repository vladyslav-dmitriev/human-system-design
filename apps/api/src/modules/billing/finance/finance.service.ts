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
import { resolveAllowedPrice } from '../price-allowlist';
import { ErrorCode } from '../../../common/errors';

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

    throw new BadRequestException({
      code: ErrorCode.VALIDATION_FAILED,
      message: 'Unsupported checkout type',
    });
  }

  async createSubscription(userId: string, priceId: string) {
    const billingProfile = await this.getUserBilling(userId);

    const stripeCustomerId = billingProfile?.billing.stripeCustomerId;

    if (!stripeCustomerId) {
      throw new Error('User not found');
    }

    const { product } = await resolveAllowedPrice(
      this.financeRepository,
      this.paymentsService,
      priceId,
      'recurring',
    );
    const productName = product.name;

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

    const { price, product } = await resolveAllowedPrice(
      this.financeRepository,
      this.paymentsService,
      priceId,
      'one_time',
    );
    const productName = product.name;

    const paymentIntent = await this.paymentsService.createPaymentIntent({
      stripeCustomerId,
      currency: price.currency,
      amount: price.unit_amount,
      metadata: {
        type: 'one_time',
        name: productName,
        priceId: price.id,
        productId: product.id,
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

  async getPaymentIntent(userId: string, params: PaymentIntentGetParamsDto) {
    const billingProfile = await this.getUserBilling(userId);
    const stripeCustomerId = billingProfile?.billing.stripeCustomerId;

    const notFound = () =>
      new NotFoundException({
        code: ErrorCode.NOT_FOUND,
        message: 'Payment intent not found',
      });

    let paymentIntent: Awaited<ReturnType<PaymentsService['getPaymentIntent']>>;

    try {
      paymentIntent = await this.paymentsService.getPaymentIntent(
        params.paymentIntentId,
      );
    } catch {
      throw notFound();
    }

    // Чужой PaymentIntent неотличим от несуществующего.
    const owner =
      typeof paymentIntent.customer === 'string'
        ? paymentIntent.customer
        : paymentIntent.customer?.id;

    if (!stripeCustomerId || owner !== stripeCustomerId) {
      throw notFound();
    }

    if (paymentIntent.status !== 'succeeded') {
      throw new BadRequestException({
        code: ErrorCode.VALIDATION_FAILED,
        message: 'Payment not successful',
      });
    }

    return {
      amount: paymentIntent.amount,
      currency: paymentIntent.currency,
      status: paymentIntent.status,
      customer: owner,
      metadata: isEmpty(paymentIntent.metadata)
        ? {
            name: 'Premium',
            type: 'subscription',
          }
        : {
            name: paymentIntent.metadata.name,
            type: paymentIntent.metadata.type,
          },
    };
  }

  async createPortalSession(userId: string) {
    const frontendUrl = this.configService.get<string>('CLIENT_URL');

    const user = await this.userRepository.getUserById(userId);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const stripeCustomerId = user.userBillingProfile.stripeCustomerId;

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

function isEmpty(obj: object) {
  for (const prop in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, prop)) {
      return false;
    }
  }

  return true;
}
