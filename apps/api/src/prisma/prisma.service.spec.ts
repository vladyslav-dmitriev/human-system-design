import { Test } from '@nestjs/testing';

import { MetricsModule } from '../modules/metrics/metrics.module';
import { MetricsService } from '../modules/metrics/metrics.service';
import { RedisMetrics } from '../modules/metrics/collectors/redis.metrics';
import { DatabaseMetrics } from '../modules/metrics/collectors/database.metrics';
import { PrismaModule } from './prisma.module';
import { PrismaService } from './prisma.service';

jest.mock('@prisma/adapter-pg', () => ({ PrismaPg: jest.fn() }));

// Fake client: $extends applies the extension's top-level $allOperations
// hook around fake model / raw operations, like Prisma does.
const mockState = { rawImpl: jest.fn(), findManyImpl: jest.fn() };
const extendedClient: any = {};
const mockConnect = jest.fn().mockResolvedValue(undefined);
const mockDisconnect = jest.fn().mockResolvedValue(undefined);

jest.mock('@prisma/client', () => ({
  PrismaClient: class {
    $connect = mockConnect;
    $disconnect = mockDisconnect;
    $on = jest.fn();
    $extends(ext: any) {
      const hook = ext.query.$allOperations;
      const run =
        (model: string | undefined, operation: string, impl: any) =>
        (args?: unknown) =>
          hook({ model, operation, args, query: (a: unknown) => impl(a) });

      extendedClient.todo = {
        findMany: run('Todo', 'findMany', (a: unknown) =>
          mockState.findManyImpl(a),
        ),
      };
      extendedClient.$queryRaw = run(undefined, '$queryRaw', (a: unknown) =>
        mockState.rawImpl(a),
      );
      extendedClient.$transaction = jest.fn().mockResolvedValue('tx');
      extendedClient.$connect = jest.fn();

      return extendedClient;
    }
  },
}));

describe('PrismaService (extension + proxy)', () => {
  let prisma: PrismaService;
  let metrics: MetricsService;

  beforeEach(async () => {
    mockConnect.mockClear();
    mockDisconnect.mockClear();
    mockState.rawImpl = jest.fn().mockResolvedValue([1]);
    mockState.findManyImpl = jest.fn().mockResolvedValue([]);

    const moduleRef = await Test.createTestingModule({
      imports: [MetricsModule, PrismaModule],
    }).compile();

    prisma = moduleRef.get(PrismaService);
    metrics = moduleRef.get(MetricsService);
  });

  const counts = async () =>
    (await metrics.dbQueryDuration.get()).values
      .filter((v) => v.metricName === 'database_query_duration_seconds_count')
      .map((v) => `${v.labels.model}:${v.labels.operation}=${v.value}`);

  it('is still an instance of PrismaService', () => {
    expect(prisma).toBeInstanceOf(PrismaService);
  });

  it('resolves MetricsService/RedisMetrics/DatabaseMetrics via global MetricsModule', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [MetricsModule],
    }).compile();

    expect(moduleRef.get(MetricsService)).toBeInstanceOf(MetricsService);
    expect(moduleRef.get(RedisMetrics)).toBeInstanceOf(RedisMetrics);
    expect(moduleRef.get(DatabaseMetrics)).toBeInstanceOf(DatabaseMetrics);
  });

  it('keeps lifecycle methods on the original instance', async () => {
    await prisma.onModuleInit();
    await prisma.onModuleDestroy();

    // original $connect/$disconnect called, extended $connect was not
    expect(extendedClient.$connect).not.toHaveBeenCalled();
    expect(mockConnect).toHaveBeenCalledTimes(1);
    expect(mockDisconnect).toHaveBeenCalledTimes(1);
  });

  it('routes model delegates through the extension', async () => {
    await (prisma as any).todo.findMany({});

    expect(mockState.findManyImpl).toHaveBeenCalledTimes(1);
    expect(await counts()).toEqual(['Todo:findMany=1']);
  });

  it('routes $transaction to the extended client', async () => {
    await expect((prisma as any).$transaction([])).resolves.toBe('tx');
    expect(extendedClient.$transaction).toHaveBeenCalledTimes(1);
  });

  it('records duration even when the query fails', async () => {
    mockState.findManyImpl = jest.fn().mockRejectedValue(new Error('db down'));

    await expect((prisma as any).todo.findMany({})).rejects.toThrow('db down');
    expect(await counts()).toEqual(['Todo:findMany=1']);
  });

  it('labels raw queries with model="raw"', async () => {
    await (prisma as any).$queryRaw('select 1');

    expect(await counts()).toEqual(['raw:$queryRaw=1']);
  });

  it('returns stable function identity', () => {
    expect((prisma as any).$transaction).toBe((prisma as any).$transaction);
    expect(prisma.onModuleInit).toBe(prisma.onModuleInit);
  });
});
