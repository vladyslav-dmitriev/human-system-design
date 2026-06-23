import { Expose, Type } from 'class-transformer';

import { SubscriptionItemDto } from '../common';

export class SubscriptionGetListResponseDto {
  @Expose()
  @Type(() => SubscriptionItemDto)
  recurring: SubscriptionItemDto[];

  @Expose()
  @Type(() => SubscriptionItemDto)
  oneTime: SubscriptionItemDto[];
}
