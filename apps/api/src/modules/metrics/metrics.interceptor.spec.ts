import {
  CallHandler,
  ExecutionContext,
  NotFoundException,
} from '@nestjs/common';
import { lastValueFrom, of, throwError } from 'rxjs';

import { MetricsInterceptor } from './metrics.interceptor';
import { MetricsService } from './metrics.service';

const ctx = (req: any, res: any = { statusCode: 200 }) =>
  ({
    getType: () => 'http',
    switchToHttp: () => ({ getRequest: () => req, getResponse: () => res }),
  }) as unknown as ExecutionContext;

const handler = (obs: any): CallHandler => ({ handle: () => obs });

describe('MetricsInterceptor', () => {
  let metrics: MetricsService;
  let interceptor: MetricsInterceptor;

  beforeEach(() => {
    metrics = new MetricsService();
    interceptor = new MetricsInterceptor(metrics);
  });

  const counter = async () =>
    (await metrics.httpRequestsTotal.get()).values.map((v) => ({
      ...v.labels,
      value: v.value,
    }));

  it('records successful requests', async () => {
    const req = { method: 'GET', route: { path: '/todo/:id' }, url: '/todo/1' };
    await lastValueFrom(
      interceptor.intercept(ctx(req, { statusCode: 201 }), handler(of('ok'))),
    );

    expect(await counter()).toEqual([
      { method: 'GET', route: '/todo/:id', status: '201', value: 1 },
    ]);
  });

  it('records failed requests with the exception status and rethrows', async () => {
    const req = { method: 'GET', route: { path: '/todo/:id' }, url: '/todo/1' };
    const err = new NotFoundException();

    await expect(
      lastValueFrom(
        interceptor.intercept(ctx(req), handler(throwError(() => err))),
      ),
    ).rejects.toBe(err);

    expect(await counter()).toEqual([
      { method: 'GET', route: '/todo/:id', status: '404', value: 1 },
    ]);
  });

  it('uses 500 for a plain Error (not HttpException)', async () => {
    const req = { method: 'POST', route: { path: '/x' } };

    await expect(
      lastValueFrom(
        interceptor.intercept(
          ctx(req),
          handler(throwError(() => new Error('boom'))),
        ),
      ),
    ).rejects.toThrow('boom');

    expect((await counter())[0]).toMatchObject({ status: '500' });
  });

  it("uses 'unknown' route instead of req.url", async () => {
    const req = { method: 'GET', url: '/secret/123?token=abc' };
    await lastValueFrom(interceptor.intercept(ctx(req), handler(of(1))));

    expect((await counter())[0]).toMatchObject({ route: 'unknown' });
  });

  it('skips the /metrics route', async () => {
    const req = {
      method: 'GET',
      route: { path: '/metrics' },
      path: '/metrics',
    };
    await lastValueFrom(interceptor.intercept(ctx(req), handler(of(1))));

    expect(await counter()).toEqual([]);
  });

  it('does not double-record when the stream emits several values', async () => {
    const req = { method: 'GET', route: { path: '/s' } };
    await lastValueFrom(interceptor.intercept(ctx(req), handler(of(1, 2, 3))));

    expect(await counter()).toEqual([
      { method: 'GET', route: '/s', status: '200', value: 1 },
    ]);
  });

  it('passes through non-http contexts without recording', async () => {
    const rpc = { getType: () => 'rpc' } as unknown as ExecutionContext;
    await lastValueFrom(interceptor.intercept(rpc, handler(of(1))));

    expect(await counter()).toEqual([]);
  });
});
