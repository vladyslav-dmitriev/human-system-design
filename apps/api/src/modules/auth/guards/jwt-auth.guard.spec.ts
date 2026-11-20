import { UnauthorizedException, type ExecutionContext } from '@nestjs/common';
import { decode } from '@auth/core/jwt';

import { AuthGuard } from './jwt-auth.guard';

jest.mock('@auth/core/jwt', () => ({ decode: jest.fn() }));

const decodeMock = decode as jest.Mock;

const ctx = (request: Record<string, unknown>) =>
  ({
    switchToHttp: () => ({ getRequest: () => request }),
  }) as unknown as ExecutionContext;

describe('AuthGuard', () => {
  const guard = new AuthGuard();
  const env = { ...process.env };

  beforeEach(() => {
    decodeMock.mockReset();
    process.env = { ...env, AUTH_SECRET: 'test-secret' };
    delete process.env.NEXTAUTH_SECRET;
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
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
});
