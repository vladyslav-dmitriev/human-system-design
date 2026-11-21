import { Controller, Get, HttpStatus, Inject, Res } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import type { Response } from 'express';
import Redis from 'ioredis';

import { Serialize } from 'interceptors';
import { HealthResponseDto } from './app.dto';
import { REDIS_CLIENT } from './redis';

const REDIS_PING_TIMEOUT_MS = 2000;

@Controller('')
@SkipThrottle()
export class AppController {
  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

  /**
   * Готовность: 200 `{status:'ok', redis:'up'}`, если Redis отвечает на PING,
   * иначе 503 `{status:'error', redis:'down'}`. Это штатный ответ, а не исключение:
   * пробники (compose, k8s) не засоряют лог стеками.
   */
  @Get('health')
  @Serialize(HealthResponseDto)
  async healthCheck(@Res({ passthrough: true }) res: Response) {
    const redis = await this.pingRedis();

    if (redis !== 'up') {
      res.status(HttpStatus.SERVICE_UNAVAILABLE);

      return { status: 'error', redis };
    }

    return { status: 'ok', redis };
  }

  private async pingRedis(): Promise<'up' | 'down'> {
    // Нет соединения: не копим PING в офлайн-очереди ioredis
    if (this.redis.status && this.redis.status !== 'ready') {
      return 'down';
    }

    let timer: NodeJS.Timeout | undefined;

    try {
      const pong = await Promise.race([
        this.redis.ping(),
        new Promise<never>((_, reject) => {
          timer = setTimeout(
            () => reject(new Error('timeout')),
            REDIS_PING_TIMEOUT_MS,
          );
        }),
      ]);

      return pong === 'PONG' ? 'up' : 'down';
    } catch {
      return 'down';
    } finally {
      // Таймер не должен жить 2 с после каждого PING (держит event loop и тесты)
      clearTimeout(timer);
    }
  }
}
