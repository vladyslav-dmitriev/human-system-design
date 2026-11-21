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
import {
  ApiCookieAuth,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
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
@ApiCookieAuth()
@ApiUnauthorizedResponse({ description: 'No valid session' })
@Controller('billing/payment-methods')
@UseGuards(AuthGuard)
export class PaymentMethodsController {
  constructor(
    @Inject(PaymentMethodService)
    private readonly paymentMethodService: PaymentMethodService,
  ) {}

  @Get()
  @ApiOkResponse({ type: PaymentMethodGetListResponseDto, isArray: true })
  @Serialize(PaymentMethodGetListResponseDto)
  async getPaymentMethods(
    @GetUser('id') userId: string,
  ): Promise<PaymentMethod[]> {
    return this.paymentMethodService.getPaymentMethods(userId);
  }

  @Post(':paymentMethodId')
  @ApiOkResponse({ type: PaymentMethodAddResponseDto })
  @ApiNotFoundResponse({ description: 'Payment method not found or not owned' })
  @Serialize(PaymentMethodAddResponseDto)
  async addPaymentMethod(
    @GetUser('id') userId: string,
    @Param() params: PaymentMethodAddParamsDto,
  ) {
    return this.paymentMethodService.addPaymentMethod(userId, params);
  }

  @Delete(':paymentMethodId')
  @ApiOkResponse({ type: PaymentMethodDeleteResponseDto })
  @ApiNotFoundResponse({ description: 'Payment method not found or not owned' })
  @Serialize(PaymentMethodDeleteResponseDto)
  async deletePaymentMethod(
    @GetUser('id') userId: string,
    @Param() params: PaymentMethodDeleteParamsDto,
  ) {
    return this.paymentMethodService.deletePaymentMethod(userId, params);
  }
}
