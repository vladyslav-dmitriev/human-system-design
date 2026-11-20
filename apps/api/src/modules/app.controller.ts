import {
  Controller,
  Get,
  Inject,
  ServiceUnavailableException,
} from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import Redis from 'ioredis';

import { REDIS_CLIENT } from './redis';

const REDIS_PING_TIMEOUT_MS = 2000;

@Controller('')
@SkipThrottle()
export class AppController {
  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

  /** Готовность: 200, если Redis отвечает на PING, иначе 503. */
  @Get('health')
  async healthCheck() {
    const redis = await this.pingRedis();

    if (redis !== 'up') {
      throw new ServiceUnavailableException({ status: 'error', redis });
    }

    return { status: 'ok', redis };
  }

  private async pingRedis(): Promise<'up' | 'down'> {
    try {
      const pong = await Promise.race([
        this.redis.ping(),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('timeout')), REDIS_PING_TIMEOUT_MS),
        ),
      ]);

      return pong === 'PONG' ? 'up' : 'down';
    } catch {
      return 'down';
    }
  }
}
