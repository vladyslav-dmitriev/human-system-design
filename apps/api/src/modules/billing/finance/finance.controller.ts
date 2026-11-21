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
import {
  ApiCookieAuth,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
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
  WebhookResponseDto,
} from './dto';
import { Serialize } from 'interceptors';

interface RequestWithRawBody extends Request {
  rawBody: Buffer;
}

@ApiTags('Billing')
@ApiCookieAuth()
@ApiUnauthorizedResponse({ description: 'No valid session' })
@Controller('/billing')
export class FinanceController {
  constructor(
    @Inject(FinanceService) private readonly financeService: FinanceService,
    @Inject(WebhookService) private readonly webhookService: WebhookService,
  ) {}

  @Get('user')
  @UseGuards(AuthGuard)
  @ApiOkResponse({ type: UserGetBillingResponseDto })
  @Serialize(UserGetBillingResponseDto)
  async getUserBilling(@GetUser('id') userId: string) {
    return this.financeService.getUserBilling(userId);
  }

  @Post('create-portal-session')
  @UseGuards(AuthGuard)
  @ApiOkResponse({ type: PortalSessionCreateResponseDto })
  @Serialize(PortalSessionCreateResponseDto)
  async createPortalSession(@GetUser('id') userId: string) {
    return this.financeService.createPortalSession(userId);
  }

  @Post('/webhook')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ type: WebhookResponseDto })
  @Serialize(WebhookResponseDto)
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
  @ApiOkResponse({ type: CheckoutCreateResponseDto })
  @Serialize(CheckoutCreateResponseDto)
  async createCheckout(
    @GetUser('id') userId: string,
    @Body() body: CheckoutCreateBodyDto,
  ) {
    return this.financeService.createCheckout(userId, body);
  }

  @Get('payment-intents/:paymentIntentId')
  @UseGuards(AuthGuard)
  @ApiOkResponse({ type: PaymentIntentGetResponseDto })
  @ApiNotFoundResponse({ description: 'Not found or not owned by the user' })
  @Serialize(PaymentIntentGetResponseDto)
  async getPaymentIntent(
    @GetUser('id') userId: string,
    @Param() params: PaymentIntentGetParamsDto,
  ) {
    return this.financeService.getPaymentIntent(userId, params);
  }
}
