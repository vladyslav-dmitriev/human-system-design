import request from 'supertest';
import type { INestApplication } from '@nestjs/common';

import { AppController } from '../src/modules/app.controller';
import { REDIS_CLIENT } from '../src/modules/redis';
import { createTestApp } from './helpers/app';

describe('GET /health (nest testing module, fake Redis)', () => {
  let app: INestApplication;
  const redis = { ping: jest.fn() };

  beforeEach(async () => {
    redis.ping.mockReset();
    app = await createTestApp({
      controllers: [AppController],
      providers: [{ provide: REDIS_CLIENT, useValue: redis }],
    });
  });

  afterEach(() => app.close());

  it('Redis answers PONG -> 200 {status:"ok", redis:"up"} (not an empty {})', async () => {
    redis.ping.mockResolvedValue('PONG');
    const res = await request(app.getHttpServer()).get('/health').expect(200);
    expect(res.body).toEqual({ status: 'ok', redis: 'up' });
  });

  it('Redis is down -> 503 {status:"error", redis:"down"} without internals', async () => {
    redis.ping.mockRejectedValue(new Error('ECONNREFUSED 10.0.0.1:6379'));
    const res = await request(app.getHttpServer()).get('/health').expect(503);
    expect(res.body).toEqual({ status: 'error', redis: 'down' });
  });

  it('no connection (status != ready) -> 503 without sending PING', async () => {
    const offline = { status: 'reconnecting', ping: jest.fn() };
    const offlineApp = await createTestApp({
      controllers: [AppController],
      providers: [{ provide: REDIS_CLIENT, useValue: offline }],
    });

    const res = await request(offlineApp.getHttpServer())
      .get('/health')
      .expect(503);
    expect(res.body).toEqual({ status: 'error', redis: 'down' });
    expect(offline.ping).not.toHaveBeenCalled();
    await offlineApp.close();
  });

  it('an unexpected PING reply is also treated as down', async () => {
    redis.ping.mockResolvedValue('NOPE');
    await request(app.getHttpServer()).get('/health').expect(503);
  });
});
