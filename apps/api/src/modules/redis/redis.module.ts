import { Module, Global } from '@nestjs/common';
import Redis from 'ioredis';

import { redisConfig } from '../../config/redis.config';

@Global()
@Module({
  providers: [
    {
      provide: 'REDIS_CLIENT',
      useFactory: () => {
        return new Redis(redisConfig.url);
      },
    },
  ],
  exports: ['REDIS_CLIENT'],
})
export class RedisModule {}
