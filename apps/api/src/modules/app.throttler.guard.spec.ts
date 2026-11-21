import { decode } from '@auth/core/jwt';

import { AppThrottlerGuard } from './app.throttler.guard';

jest.mock('@auth/core/jwt', () => ({ decode: jest.fn() }));

const decodeMock = decode as jest.Mock;
const SECRET = 's'.repeat(40);

describe('AppThrottlerGuard.getTracker', () => {
  const guard = Object.create(AppThrottlerGuard.prototype) as {
    getTracker(req: Record<string, unknown>): Promise<string>;
  };
  const env = { ...process.env };

  const track = (req: Record<string, unknown>) => guard.getTracker(req);

  beforeEach(() => {
    process.env = { ...env, AUTH_SECRET: 'auth-secret' };
    delete process.env.NODE_ENV;
    delete process.env.INTERNAL_API_SECRET;
    decodeMock.mockReset().mockResolvedValue({ id: 'u1' });
  });

  afterAll(() => {
    process.env = env;
  });

  it('a session user is tracked as user:<id> outside service-auth', async () => {
    await expect(
      track({
        ip: '10.0.0.1',
        originalUrl: '/todos',
        cookies: { 'authjs.session-token': 'tok' },
      }),
    ).resolves.toBe('user:u1');
  });

  it('an anonymous request is tracked by IP', async () => {
    await expect(
      track({ ip: '10.0.0.1', originalUrl: '/todos', cookies: {} }),
    ).resolves.toBe('ip:10.0.0.1');
  });

  it.each([
    '/service-auth/login',
    '/service-auth/verify-otp?x=1',
    '/service-auth/validate',
    '/service-auth',
  ])(
    'service-auth is ALWAYS by IP, even with a (forged) session cookie: %s',
    async (originalUrl) => {
      await expect(
        track({
          ip: '10.0.0.1',
          originalUrl,
          cookies: { 'authjs.session-token': 'forged' },
        }),
      ).resolves.toBe('ip:10.0.0.1');
      expect(decodeMock).not.toHaveBeenCalled();
    },
  );

  it('a path that only starts with the same letters is not service-auth', async () => {
    await expect(
      track({
        ip: '10.0.0.1',
        originalUrl: '/service-authx/login',
        cookies: { 'authjs.session-token': 'tok' },
      }),
    ).resolves.toBe('user:u1');
  });

  it('in production the plain cookie is not even decoded', async () => {
    process.env.NODE_ENV = 'production';

    await expect(
      track({
        ip: '10.0.0.1',
        originalUrl: '/todos',
        cookies: { 'authjs.session-token': 'forged' },
      }),
    ).resolves.toBe('ip:10.0.0.1');
    expect(decodeMock).not.toHaveBeenCalled();
  });

  it('a cookie that fails to decode falls back to IP', async () => {
    decodeMock.mockRejectedValue(new Error('bad'));

    await expect(
      track({
        ip: '10.0.0.1',
        originalUrl: '/todos',
        cookies: { 'authjs.session-token': 'tok' },
      }),
    ).resolves.toBe('ip:10.0.0.1');
  });

  describe('X-Client-IP', () => {
    beforeEach(() => {
      process.env.INTERNAL_API_SECRET = SECRET;
    });

    it('with the right secret the client IP replaces the web server IP', async () => {
      await expect(
        track({
          ip: '172.18.0.5',
          originalUrl: '/service-auth/login',
          headers: {
            'x-internal-secret': SECRET,
            'x-client-ip': '203.0.113.7',
          },
        }),
      ).resolves.toBe('ip:203.0.113.7');
    });

    it('without / with a wrong secret the header is ignored (cannot dodge the limit by spoofing)', async () => {
      for (const headers of [
        { 'x-client-ip': '203.0.113.7' },
        { 'x-internal-secret': 'wrong', 'x-client-ip': '203.0.113.7' },
      ]) {
        await expect(
          track({
            ip: '198.51.100.9',
            originalUrl: '/service-auth/login',
            headers,
          }),
        ).resolves.toBe('ip:198.51.100.9');
      }
    });
  });
});
