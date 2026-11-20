import { Injectable, Inject, Logger } from '@nestjs/common';
import Redis from 'ioredis';

import { REDIS_CLIENT } from '../redis';
import { RedisMetrics } from '../metrics';

/**
 * Кэш поверх Redis. Отказоустойчивый: если Redis недоступен или в ключе
 * лежит мусор, get() ведёт себя как промах, а set()/del() не бросают ошибку —
 * вызывающий код просто идёт за данными в источник.
 */
@Injectable()
export class CacheService {
  private readonly logger = new Logger(CacheService.name);

  constructor(
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
    @Inject(RedisMetrics) private readonly metrics: RedisMetrics,
  ) {}

  async get<T>(key: string): Promise<T | null> {
    try {
      const data = await this.redis.get(key);

      if (data) {
        this.metrics.hit();

        return JSON.parse(data) as T;
      }
    } catch (error) {
      this.logger.warn(`get(${key}) failed: ${(error as Error).message}`);
    }

    this.metrics.miss();

    return null;
  }

  async set(key: string, value: unknown, ttl: number = 3600): Promise<void> {
    try {
      await this.redis.set(key, JSON.stringify(value), 'EX', ttl);
    } catch (error) {
      this.logger.warn(`set(${key}) failed: ${(error as Error).message}`);
    }
  }

  async del(key: string): Promise<void> {
    try {
      await this.redis.del(key);
    } catch (error) {
      this.logger.warn(`del(${key}) failed: ${(error as Error).message}`);
    }
  }
}
