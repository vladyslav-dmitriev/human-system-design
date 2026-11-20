import { CacheService } from './cache.service';
import { RedisMetrics } from '../metrics/collectors/redis.metrics';
import { MetricsService } from '../metrics/metrics.service';

describe('CacheService metrics wiring', () => {
  const setup = (value: string | null) => {
    const redis = { get: jest.fn().mockResolvedValue(value) } as any;
    const metrics = new MetricsService();
    const service = new CacheService(redis, new RedisMetrics(metrics));

    return { service, metrics };
  };

  const values = async (m: MetricsService) =>
    Object.fromEntries(
      (await m.redisCacheHitsMisses.get()).values.map((v) => [
        v.labels.result,
        v.value,
      ]),
    );

  it('counts a hit', async () => {
    const { service, metrics } = setup('{"a":1}');

    await expect(service.get('k')).resolves.toEqual({ a: 1 });
    expect(await values(metrics)).toEqual({ hit: 1 });
  });

  it('counts a miss', async () => {
    const { service, metrics } = setup(null);

    await expect(service.get('k')).resolves.toBeNull();
    expect(await values(metrics)).toEqual({ miss: 1 });
  });
});
