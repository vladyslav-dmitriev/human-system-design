import { Module } from '@nestjs/common';

import { UserModule } from '../../user';
import { CacheModule } from '../../cache';
import { PaymentsModule } from '../payments';

import { SubscriptionService } from './subscription.service';
import { SubscriptionsController } from './subscriptions.controller';
import { SubscriptionRepository } from './subscription.repository';

@Module({
  imports: [UserModule, CacheModule, PaymentsModule],
  providers: [SubscriptionService, SubscriptionRepository],
  controllers: [SubscriptionsController],
})
export class SubscriptionModule {}
