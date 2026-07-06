import { Injectable, Inject } from '@nestjs/common';
import Redis from 'ioredis';
// import { Counter } from 'prom-client';

// const cacheCounter = new Counter({
//   name: 'redis_cache_hits_misses',
//   help: 'Count of cache hits and misses',
//   labelNames: ['result'],
// });

@Injectable()
export class CacheService {
  constructor(@Inject('REDIS_CLIENT') private readonly redis: Redis) {}

  async get<T>(key: string): Promise<T | null> {
    const data = await this.redis.get(key);

    if (data) {
      // cacheCounter.inc({ result: 'hit' });

      return JSON.parse(data);
    }

    // cacheCounter.inc({ result: 'miss' });

    return null;
  }

  async set(key: string, value: any, ttl: number = 3600): Promise<void> {
    await this.redis.set(key, JSON.stringify(value), 'EX', ttl);
  }
}
