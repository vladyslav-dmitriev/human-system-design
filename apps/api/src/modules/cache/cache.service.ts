import { Injectable, Inject } from '@nestjs/common';
import Redis from 'ioredis';

import { RedisMetrics } from '../metrics/collectors/redis.metrics';

@Injectable()
export class CacheService {
  constructor(
    @Inject('REDIS_CLIENT') private readonly redis: Redis,
    @Inject(RedisMetrics) private readonly metrics: RedisMetrics,
  ) {}

  async get<T>(key: string): Promise<T | null> {
    const data = await this.redis.get(key);

    if (data) {
      this.metrics.hit();

      return JSON.parse(data);
    }

    this.metrics.miss();

    return null;
  }

  async set(key: string, value: any, ttl: number = 3600): Promise<void> {
    await this.redis.set(key, JSON.stringify(value), 'EX', ttl);
  }
}
