import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
  forwardRef,
} from '@nestjs/common';
import { PaymentsService } from '../payments';
import { UserRepository } from '../../user';
import { PaymentMethodRepository } from './payment-method.repository';
import { PaymentMethod } from './payment-method.interface';
import { PaymentMethodAddParamsDto, PaymentMethodDeleteParamsDto } from './dto';
import { FinanceService } from '../finance';
import { ErrorCode } from '../../../common/errors';

@Injectable()
export class PaymentMethodService {
  constructor(
    @Inject(PaymentsService) private readonly paymentsService: PaymentsService,
    @Inject(UserRepository)
    private readonly userRepository: UserRepository,
    @Inject(PaymentMethodRepository)
    private readonly paymentMethodRepository: PaymentMethodRepository,
    @Inject(forwardRef(() => FinanceService))
    private readonly financeService: FinanceService,
  ) {}

  async getPaymentMethods(userId: string): Promise<PaymentMethod[]> {
    const userBillingProfile = await this.financeService.getUserBilling(userId);

    const stripeCustomerId = userBillingProfile?.billing?.stripeCustomerId;
    const defaultPaymentMethodId =
      userBillingProfile?.billing?.defaultPaymentMethodId;

    if (!stripeCustomerId) {
      throw new NotFoundException('User not found');
    }

    const paymentMethods =
      await this.paymentsService.getPaymentMethods(stripeCustomerId);

    return paymentMethods.data.map((pm) => ({
      id: pm.id,
      brand: pm.card?.brand ?? '',
      last4: pm.card?.last4 ?? '',
      expMonth: pm.card?.exp_month,
      expYear: pm.card?.exp_year,
      isDefault: pm.id === defaultPaymentMethodId,
    }));
  }

  async addPaymentMethod(userId: string, dto: PaymentMethodAddParamsDto) {
    const { paymentMethodId } = dto;

    const userBillingProfile = await this.financeService.getUserBilling(userId);

    const stripeCustomerId = userBillingProfile?.billing?.stripeCustomerId;

    if (!stripeCustomerId) {
      throw new NotFoundException('User not found');
    }

    try {
      await this.paymentsService.addPaymentMethod(
        stripeCustomerId,
        paymentMethodId,
      );
    } catch (error) {
      // Чужой или несуществующий payment method (Stripe: invalid_request_error)
      // неотличим от «не найден»; текст Stripe клиенту не отдаём.
      console.error('Stripe attach payment method failed:', error);

      if ((error as { type?: string })?.type === 'StripeInvalidRequestError') {
        throw new NotFoundException({
          code: ErrorCode.NOT_FOUND,
          message: 'Payment method not found',
        });
      }

      throw new BadRequestException('Stripe Attach Error');
    }

    await this.updateDefaultPaymentMethod(
      userId,
      stripeCustomerId,
      paymentMethodId,
    );

    return { success: true };
  }

  async deletePaymentMethod(
    userId: string,
    params: PaymentMethodDeleteParamsDto,
  ) {
    const { paymentMethodId } = params;

    const user = await this.userRepository.getUserById(userId);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const { stripeCustomerId } = user.userBillingProfile;

    // Владелец проверяется по списку карт Stripe-клиента пользователя:
    // чужая и несуществующая карта дают одинаковый 404.
    const ownPaymentMethods =
      await this.paymentsService.getPaymentMethods(stripeCustomerId);

    if (!ownPaymentMethods.data.some((pm) => pm.id === paymentMethodId)) {
      throw new NotFoundException({
        code: ErrorCode.NOT_FOUND,
        message: 'Payment method not found',
      });
    }

    try {
      if (user.userBillingProfile.defaultPaymentMethodId === paymentMethodId) {
        const nextPaymentMethodId = ownPaymentMethods.data.find(
          (pm) => pm.id !== paymentMethodId,
        )?.id;

        if (nextPaymentMethodId) {
          await this.updateDefaultPaymentMethod(
            userId,
            stripeCustomerId,
            nextPaymentMethodId,
          );
        }
      }

      await this.paymentsService.deletePaymentMethod(
        stripeCustomerId,
        paymentMethodId,
      );

      return { success: true };
    } catch (error) {
      console.error('Stripe detach payment method failed:', error);
      throw new BadRequestException('Stripe Detach Error');
    }
  }

  async updateDefaultPaymentMethod(
    userId: string,
    stripeCustomerId: string,
    paymentMethodId: string,
  ) {
    try {
      await this.paymentsService.updateDefaultPaymentMethod(
        stripeCustomerId,
        paymentMethodId,
      );

      await this.paymentMethodRepository.updateDefaultPaymentMethod(
        userId,
        paymentMethodId,
      );
    } catch (error) {
      console.error(`Can't update default payment method:`, error);
    }
  }
}
