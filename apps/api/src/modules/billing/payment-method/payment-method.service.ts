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

      await this.updateDefaultPaymentMethod(
        userId,
        stripeCustomerId,
        paymentMethodId,
      );

      return { success: true };
    } catch (error) {
      throw new BadRequestException(`Stripe Attach Error: ${error}`);
    }
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

    try {
      if (user.userBillingProfile.defaultPaymentMethodId === paymentMethodId) {
        const paymentMethods = await this.getPaymentMethods(userId);
        const nextPaymentMethodId = paymentMethods.find(
          (pm) => pm.id !== paymentMethodId,
        )?.id;

        if (nextPaymentMethodId) {
          await this.updateDefaultPaymentMethod(
            user.userId,
            user.userBillingProfile.stripeCustomerId,
            nextPaymentMethodId,
          );
        }
      }

      await this.paymentsService.deletePaymentMethod(
        user.userBillingProfile.stripeCustomerId,
        paymentMethodId,
      );

      return { success: true };
    } catch (error) {
      throw new BadRequestException(`Stripe Detach Error: ${error}`);
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
