import {
  Logger,
  ServiceUnavailableException,
  UnauthorizedException,
  type ExecutionContext,
} from '@nestjs/common';
import { decode } from '@auth/core/jwt';

import { AuthGuard } from './jwt-auth.guard';

jest.mock('@auth/core/jwt', () => ({ decode: jest.fn() }));

const decodeMock = decode as jest.Mock;

const ctx = (request: Record<string, unknown>) =>
  ({
    switchToHttp: () => ({ getRequest: () => request }),
  }) as unknown as ExecutionContext;

describe('AuthGuard', () => {
  const redis = { get: jest.fn() };
  const guard = new AuthGuard(redis as never);
  const env = { ...process.env };

  beforeEach(() => {
    decodeMock.mockReset();
    redis.get.mockReset().mockResolvedValue(null);
    process.env = { ...env, AUTH_SECRET: 'test-secret' };
    delete process.env.NEXTAUTH_SECRET;
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
  });

  afterAll(() => {
    process.env = env;
    jest.restoreAllMocks();
  });

  it('rejects a request without cookies', async () => {
    await expect(guard.canActivate(ctx({}))).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    expect(decodeMock).not.toHaveBeenCalled();
  });

  it('rejects a request with unrelated cookies only', async () => {
    await expect(
      guard.canActivate(ctx({ cookies: { foo: 'bar' } })),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it.each([
    'authjs.session-token',
    '__Secure-authjs.session-token',
    'next-auth.session-token',
    '__Secure-next-auth.session-token',
  ])('uses %s as the cookie name and salt', async (name) => {
    decodeMock.mockResolvedValue({ id: 'u1', email: 'a@test.dev' });
    const request: Record<string, unknown> = { cookies: { [name]: 'tok' } };

    await expect(guard.canActivate(ctx(request))).resolves.toBe(true);

    expect(decodeMock).toHaveBeenCalledWith({
      token: 'tok',
      secret: 'test-secret',
      salt: name,
    });
  });

  it('puts the decoded session into request.user, preferring payload.id over sub', async () => {
    decodeMock.mockResolvedValue({
      id: 'u1',
      sub: 'other',
      email: 'a@test.dev',
      name: 'Ann',
      role: 'ADMIN',
    });
    const request: Record<string, unknown> = {
      cookies: { 'authjs.session-token': 't' },
    };

    await guard.canActivate(ctx(request));

    expect(request.user).toEqual({
      id: 'u1',
      email: 'a@test.dev',
      name: 'Ann',
      role: 'ADMIN',
    });
  });

  it('falls back to sub when payload has no id', async () => {
    decodeMock.mockResolvedValue({ sub: 'sub-1', email: 'a@test.dev' });
    const request: Record<string, unknown> = {
      cookies: { 'authjs.session-token': 't' },
    };

    await guard.canActivate(ctx(request));

    expect((request.user as { id: string }).id).toBe('sub-1');
  });

  it('accepts NEXTAUTH_SECRET when AUTH_SECRET is unset', async () => {
    delete process.env.AUTH_SECRET;
    process.env.NEXTAUTH_SECRET = 'legacy';
    decodeMock.mockResolvedValue({ id: 'u1', email: 'e' });

    await guard.canActivate(ctx({ cookies: { 'authjs.session-token': 't' } }));

    expect(decodeMock).toHaveBeenCalledWith(
      expect.objectContaining({ secret: 'legacy' }),
    );
  });

  it('rejects (401) when no secret is configured, never decodes', async () => {
    delete process.env.AUTH_SECRET;

    await expect(
      guard.canActivate(ctx({ cookies: { 'authjs.session-token': 't' } })),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(decodeMock).not.toHaveBeenCalled();
  });

  it('rejects an empty payload and does not set request.user', async () => {
    decodeMock.mockResolvedValue(null);
    const request: Record<string, unknown> = {
      cookies: { 'authjs.session-token': 't' },
    };

    await expect(guard.canActivate(ctx(request))).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    expect(request.user).toBeUndefined();
  });

  it('rejects a token that fails to decode (tampered or expired)', async () => {
    decodeMock.mockRejectedValue(new Error('JWTExpired'));

    await expect(
      guard.canActivate(ctx({ cookies: { 'authjs.session-token': 't' } })),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  describe('session version (revoking sessions)', () => {
    const request = () => ({ cookies: { 'authjs.session-token': 't' } });

    it('token without sessionVersion counts as 0: passes while Redis has no key', async () => {
      decodeMock.mockResolvedValue({ id: 'u1', email: 'e' });

      await expect(guard.canActivate(ctx(request()))).resolves.toBe(true);
      expect(redis.get).toHaveBeenCalledWith('session-version:u1');
    });

    it('token version equal to Redis passes', async () => {
      decodeMock.mockResolvedValue({ id: 'u1', sessionVersion: 3 });
      redis.get.mockResolvedValue('3');

      await expect(guard.canActivate(ctx(request()))).resolves.toBe(true);
    });

    it('token without the field after the version was bumped -> 401 UNAUTHORIZED', async () => {
      decodeMock.mockResolvedValue({ id: 'u1' });
      redis.get.mockResolvedValue('1');
      const req = request() as Record<string, unknown>;

      await expect(guard.canActivate(ctx(req))).rejects.toMatchObject({
        status: 401,
        response: expect.objectContaining({ code: 'UNAUTHORIZED' }),
      });
      expect(req.user).toBeUndefined();
    });

    it('stale token version (lower than Redis) -> 401', async () => {
      decodeMock.mockResolvedValue({ id: 'u1', sessionVersion: 1 });
      redis.get.mockResolvedValue('2');

      await expect(guard.canActivate(ctx(request()))).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
    });

    it('token version ahead of Redis (key lost) -> 401, never trusted', async () => {
      decodeMock.mockResolvedValue({ id: 'u1', sessionVersion: 5 });
      redis.get.mockResolvedValue(null);

      await expect(guard.canActivate(ctx(request()))).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
    });

    it.each(['2', -1, null, {}])(
      'non-numeric or negative sessionVersion %j in the token counts as 0',
      async (value) => {
        decodeMock.mockResolvedValue({ id: 'u1', sessionVersion: value });
        redis.get.mockResolvedValue('1');

        await expect(guard.canActivate(ctx(request()))).rejects.toBeInstanceOf(
          UnauthorizedException,
        );
      },
    );

    it('Redis down -> 503, not 401 and not a pass', async () => {
      decodeMock.mockResolvedValue({ id: 'u1' });
      redis.get.mockRejectedValue(new Error('ECONNREFUSED'));

      await expect(guard.canActivate(ctx(request()))).rejects.toBeInstanceOf(
        ServiceUnavailableException,
      );
    });

    it('a token without any user id is rejected', async () => {
      decodeMock.mockResolvedValue({ email: 'e' });

      await expect(guard.canActivate(ctx(request()))).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
    });
  });
});
