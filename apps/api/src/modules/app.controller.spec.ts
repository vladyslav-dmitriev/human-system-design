import { AppController } from './app.controller';

jest.mock('interceptors', () => ({ Serialize: () => () => undefined }), {
  virtual: true,
});
jest.mock('./redis', () => ({ REDIS_CLIENT: 'REDIS_CLIENT' }));

describe('AppController /health', () => {
  const res = { status: jest.fn() };

  beforeEach(() => {
    jest.useFakeTimers();
    res.status.mockReset();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('ok: Redis answers PONG and no ping timer is left behind', async () => {
    const redis = {
      status: 'ready',
      ping: jest.fn().mockResolvedValue('PONG'),
    };
    const controller = new AppController(redis as never);

    await expect(controller.healthCheck(res as never)).resolves.toEqual({
      status: 'ok',
      redis: 'up',
    });
    expect(jest.getTimerCount()).toBe(0);
  });

  it('503 when PING fails, and the timer is cleared too', async () => {
    const redis = {
      status: 'ready',
      ping: jest.fn().mockRejectedValue(new Error('down')),
    };
    const controller = new AppController(redis as never);

    await expect(controller.healthCheck(res as never)).resolves.toEqual({
      status: 'error',
      redis: 'down',
    });
    expect(res.status).toHaveBeenCalledWith(503);
    expect(jest.getTimerCount()).toBe(0);
  });

  it('503 on a PING that never answers (2 s timeout)', async () => {
    const redis = {
      status: 'ready',
      ping: jest.fn(() => new Promise(() => undefined)),
    };
    const controller = new AppController(redis as never);
    const result = controller.healthCheck(res as never);

    await jest.advanceTimersByTimeAsync(2000);

    await expect(result).resolves.toEqual({ status: 'error', redis: 'down' });
    expect(jest.getTimerCount()).toBe(0);
  });

  it('no PING when the connection is not ready', async () => {
    const redis = { status: 'connecting', ping: jest.fn() };
    const controller = new AppController(redis as never);

    await expect(controller.healthCheck(res as never)).resolves.toMatchObject({
      redis: 'down',
    });
    expect(redis.ping).not.toHaveBeenCalled();
  });
});
