import {
  Global,
  Inject,
  Logger,
  Module,
  OnApplicationShutdown,
} from '@nestjs/common';
import Redis from 'ioredis';

import { getRedisUrl } from '../../config/redis.config';

export const REDIS_CLIENT = 'REDIS_CLIENT';

@Global()
@Module({
  providers: [
    {
      provide: REDIS_CLIENT,
      useFactory: () => {
        const logger = new Logger('Redis');
        const client = new Redis(getRedisUrl());

        client.on('connect', () => logger.log('Connected'));
        client.on('reconnecting', () => logger.warn('Reconnecting...'));
        client.on('error', (error) => logger.error(error.message));

        return client;
      },
    },
  ],
  exports: [REDIS_CLIENT],
})
export class RedisModule implements OnApplicationShutdown {
  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

  async onApplicationShutdown() {
    await this.redis.quit().catch(() => this.redis.disconnect());
  }
}
