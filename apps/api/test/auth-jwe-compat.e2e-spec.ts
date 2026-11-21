import { UnauthorizedException, type ExecutionContext } from '@nestjs/common';
import { encode } from '@auth/core/jwt';

import { AuthGuard } from '../src/modules/auth/guards/jwt-auth.guard';

// Без моков @auth/core: формат JWE, который выпускает web (next-auth 5 / @auth/core),
// должен расшифровываться guard-ом api с тем же секретом и salt (имя cookie).
const SECRET = 'jwe-compat-secret-of-sufficient-length';

const ctx = (request: Record<string, unknown>) =>
  ({
    switchToHttp: () => ({ getRequest: () => request }),
  }) as unknown as ExecutionContext;

describe('AuthGuard with a real @auth/core JWE', () => {
  const redis = { get: jest.fn().mockResolvedValue(null) };
  const guard = new AuthGuard(redis as never);
  const env = { ...process.env };

  beforeEach(() => {
    process.env = { ...env, AUTH_SECRET: SECRET };
    delete process.env.NEXTAUTH_SECRET;
  });

  afterAll(() => {
    process.env = env;
  });

  it.each(['authjs.session-token', '__Secure-authjs.session-token'])(
    'decrypts a token encoded with salt %s',
    async (cookieName) => {
      const token = await encode({
        token: { id: 'u1', email: 'a@test.dev', name: 'Ann', role: 'USER' },
        secret: SECRET,
        salt: cookieName,
      });
      const request: Record<string, unknown> = {
        cookies: { [cookieName]: token },
      };

      await expect(guard.canActivate(ctx(request))).resolves.toBe(true);
      expect(request.user).toMatchObject({ id: 'u1', email: 'a@test.dev' });
    },
  );

  it('rejects a token encoded with another secret', async () => {
    const token = await encode({
      token: { id: 'u1' },
      secret: 'another-secret-of-sufficient-length',
      salt: 'authjs.session-token',
    });

    await expect(
      guard.canActivate(ctx({ cookies: { 'authjs.session-token': token } })),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('rejects a token encoded with another salt (cookie name)', async () => {
    const token = await encode({
      token: { id: 'u1' },
      secret: SECRET,
      salt: '__Secure-authjs.session-token',
    });

    await expect(
      guard.canActivate(ctx({ cookies: { 'authjs.session-token': token } })),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
