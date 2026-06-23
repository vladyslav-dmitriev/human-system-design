import { Module, forwardRef } from '@nestjs/common';

import { PaymentMethodService } from './payment-method.service';
import { PaymentMethodRepository } from './payment-method.repository';
import { PaymentMethodsController } from './payment-methods.controller';
import { PaymentsModule } from '../payments';
import { UserModule } from '../../user';
import { FinanceModule } from '../finance';

@Module({
  imports: [forwardRef(() => FinanceModule), PaymentsModule, UserModule],
  providers: [PaymentMethodService, PaymentMethodRepository],
  controllers: [PaymentMethodsController],
  exports: [PaymentMethodService, PaymentMethodRepository],
})
export class PaymentMethodModule {}
