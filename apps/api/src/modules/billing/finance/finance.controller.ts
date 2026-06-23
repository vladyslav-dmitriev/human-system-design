import {
  Controller,
  Post,
  Body,
  Req,
  Headers,
  UseGuards,
  BadRequestException,
  Get,
  Param,
  Inject,
  HttpStatus,
  HttpCode,
} from '@nestjs/common';
import { ApiTags, ApiCookieAuth } from '@nestjs/swagger';
import { Request } from 'express';

import { AuthGuard } from '../../auth/guards/jwt-auth.guard';
import { GetUser } from '../../auth/decorators/get-user.decorator';
import { WebhookService } from './webhooks/webhook.service';
import { FinanceService } from './finance.service';
import {
  CheckoutCreateBodyDto,
  CheckoutCreateResponseDto,
  PaymentIntentGetParamsDto,
  PaymentIntentGetResponseDto,
  PortalSessionCreateResponseDto,
  UserGetBillingResponseDto,
} from './dto';
import { Serialize } from 'interceptors';

interface RequestWithRawBody extends Request {
  rawBody: Buffer;
}

@ApiTags('Billing')
@Controller('/billing')
export class FinanceController {
  constructor(
    @Inject(FinanceService) private readonly financeService: FinanceService,
    @Inject(WebhookService) private readonly webhookService: WebhookService,
  ) {}

  @Get('user')
  @UseGuards(AuthGuard)
  @ApiCookieAuth()
  @Serialize(UserGetBillingResponseDto)
  async getUserBilling(@GetUser('id') userId: string) {
    return this.financeService.getUserBilling(userId);
  }

  @Post('create-portal-session')
  @UseGuards(AuthGuard)
  @Serialize(PortalSessionCreateResponseDto)
  async createPortalSession(@GetUser('id') userId: string) {
    return this.financeService.createPortalSession(userId);
  }

  @Post('/webhook')
  @HttpCode(HttpStatus.OK)
  async handleStripeWebhook(
    @Headers('stripe-signature') signature: string,
    @Req() req: RequestWithRawBody,
  ) {
    if (!signature) {
      throw new BadRequestException('Missing stripe-signature header');
    }

    if (!req.rawBody) {
      throw new BadRequestException('Raw body missing');
    }

    await this.webhookService.execute(req.rawBody, signature);

    return { received: true };
  }

  @Post('checkout')
  @UseGuards(AuthGuard)
  @Serialize(CheckoutCreateResponseDto)
  async createCheckout(
    @GetUser('id') userId: string,
    @Body() body: CheckoutCreateBodyDto,
  ) {
    return this.financeService.createCheckout(userId, body);
  }

  @Get('payment-intents/:paymentIntentId')
  @UseGuards(AuthGuard)
  @Serialize(PaymentIntentGetResponseDto)
  async getPaymentIntent(@Param() params: PaymentIntentGetParamsDto) {
    return this.financeService.getPaymentIntent(params);
  }
}
