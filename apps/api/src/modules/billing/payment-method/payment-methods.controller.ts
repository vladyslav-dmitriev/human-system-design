import {
  Controller,
  Post,
  UseGuards,
  Get,
  Delete,
  Param,
  Inject,
} from '@nestjs/common';
import { AuthGuard } from '../../auth/guards/jwt-auth.guard';
import { GetUser } from '../../auth/decorators/get-user.decorator';
import { ApiCookieAuth, ApiTags } from '@nestjs/swagger';
import { PaymentMethodService } from '../payment-method/payment-method.service';
import { PaymentMethod } from './payment-method.interface';
import {
  PaymentMethodAddParamsDto,
  PaymentMethodDeleteParamsDto,
  PaymentMethodGetListResponseDto,
  PaymentMethodAddResponseDto,
  PaymentMethodDeleteResponseDto,
} from './dto';
import { Serialize } from 'interceptors';

@ApiTags('Payment Methods')
@Controller('billing/payment-methods')
@UseGuards(AuthGuard)
export class PaymentMethodsController {
  constructor(
    @Inject(PaymentMethodService)
    private readonly paymentMethodService: PaymentMethodService,
  ) {}

  @ApiCookieAuth()
  @Get()
  @Serialize(PaymentMethodGetListResponseDto)
  async getPaymentMethods(
    @GetUser('id') userId: string,
  ): Promise<PaymentMethod[]> {
    return this.paymentMethodService.getPaymentMethods(userId);
  }

  @ApiCookieAuth()
  @Post(':paymentMethodId')
  @Serialize(PaymentMethodAddResponseDto)
  async addPaymentMethod(
    @GetUser('id') userId: string,
    @Param() params: PaymentMethodAddParamsDto,
  ) {
    return this.paymentMethodService.addPaymentMethod(userId, params);
  }

  @ApiCookieAuth()
  @Delete(':paymentMethodId')
  @Serialize(PaymentMethodDeleteResponseDto)
  async deletePaymentMethod(
    @GetUser('id') userId: string,
    @Param() params: PaymentMethodDeleteParamsDto,
  ) {
    return this.paymentMethodService.deletePaymentMethod(userId, params);
  }
}
