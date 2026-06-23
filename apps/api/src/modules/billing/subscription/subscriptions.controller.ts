import { Controller, Post, Body, UseGuards, Inject } from '@nestjs/common';
import { ApiCookieAuth } from '@nestjs/swagger';

import { AuthGuard } from '../../auth/guards/jwt-auth.guard';
import { GetUser } from '../../auth/decorators/get-user.decorator';
import {
  SubscriptionUpgradeBodyDto,
  SubscriptionRenewBodyDto,
  SubscriptionRenewResponseDto,
  SubscriptionUpgradeResponseDto,
} from './dto';
import { SubscriptionService } from './subscription.service';
import { Serialize } from 'interceptors';

@Controller('billing')
@UseGuards(AuthGuard)
export class SubscriptionsController {
  constructor(
    @Inject(SubscriptionService)
    private readonly subscriptionService: SubscriptionService,
  ) {}

  @Post('subscriptions/renew')
  @ApiCookieAuth()
  @Serialize(SubscriptionRenewResponseDto)
  async setAutoRenew(
    @GetUser('id') userId: string,
    @Body() body: SubscriptionRenewBodyDto,
  ) {
    return this.subscriptionService.setAutoRenew(userId, body);
  }

  @Post('subscriptions/upgrade')
  @ApiCookieAuth()
  @Serialize(SubscriptionUpgradeResponseDto)
  async upgradeSubscription(
    @GetUser('id') userId: string,
    @Body() body: SubscriptionUpgradeBodyDto,
  ) {
    return this.subscriptionService.upgradeSubscription(userId, body);
  }
}
