import { UnauthorizedException, type ExecutionContext } from '@nestjs/common';

import {
  getForwardedClientIp,
  hasValidInternalSecret,
  isInternalSecretRequired,
} from './internal-auth';
import { InternalSecretGuard } from './guards/internal-secret.guard';
import { ErrorCode } from '../../common/errors';

const SECRET = 's'.repeat(40);
const req = (headers: Record<string, unknown>) => ({ headers });
const ctx = (request: unknown) =>
  ({
    switchToHttp: () => ({ getRequest: () => request }),
  }) as unknown as ExecutionContext;

describe('internal secret', () => {
  describe('hasValidInternalSecret', () => {
    it('accepts the exact secret', () => {
      expect(
        hasValidInternalSecret(req({ 'x-internal-secret': SECRET }), {
          INTERNAL_API_SECRET: SECRET,
        }),
      ).toBe(true);
    });

    it.each([
      ['a wrong secret', { 'x-internal-secret': 'x'.repeat(40) }],
      ['a prefix of the secret', { 'x-internal-secret': SECRET.slice(0, 39) }],
      ['an empty header', { 'x-internal-secret': '' }],
      ['no header', {}],
      ['an array header', { 'x-internal-secret': [SECRET, SECRET] }],
    ])('rejects %s', (_name, headers) => {
      expect(
        hasValidInternalSecret(req(headers), { INTERNAL_API_SECRET: SECRET }),
      ).toBe(false);
    });

    it('never accepts anything when the secret is not configured (even an empty header)', () => {
      expect(hasValidInternalSecret(req({ 'x-internal-secret': '' }), {})).toBe(
        false,
      );
      expect(
        hasValidInternalSecret(req({ 'x-internal-secret': 'anything' }), {}),
      ).toBe(false);
    });
  });

  describe('isInternalSecretRequired', () => {
    it('is always required in production', () => {
      expect(isInternalSecretRequired({ NODE_ENV: 'production' })).toBe(true);
    });

    it('outside production it is required only when configured', () => {
      expect(isInternalSecretRequired({ NODE_ENV: 'development' })).toBe(false);
      expect(
        isInternalSecretRequired({
          NODE_ENV: 'development',
          INTERNAL_API_SECRET: SECRET,
        }),
      ).toBe(true);
    });
  });

  describe('getForwardedClientIp', () => {
    const env = { INTERNAL_API_SECRET: SECRET };

    it('takes X-Client-IP only with a valid secret', () => {
      expect(
        getForwardedClientIp(
          req({ 'x-internal-secret': SECRET, 'x-client-ip': '203.0.113.7' }),
          env,
        ),
      ).toBe('203.0.113.7');
      expect(
        getForwardedClientIp(req({ 'x-client-ip': '203.0.113.7' }), env),
      ).toBeNull();
      expect(
        getForwardedClientIp(
          req({ 'x-internal-secret': 'wrong', 'x-client-ip': '203.0.113.7' }),
          env,
        ),
      ).toBeNull();
    });

    it.each(['not-an-ip', '1.2.3.4, 5.6.7.8', '', 'ip:../evil'])(
      'ignores a non-IP value %p',
      (value) => {
        expect(
          getForwardedClientIp(
            req({ 'x-internal-secret': SECRET, 'x-client-ip': value }),
            env,
          ),
        ).toBeNull();
      },
    );

    it('accepts IPv6', () => {
      expect(
        getForwardedClientIp(
          req({ 'x-internal-secret': SECRET, 'x-client-ip': '2001:db8::1' }),
          env,
        ),
      ).toBe('2001:db8::1');
    });
  });

  describe('InternalSecretGuard', () => {
    const guard = new InternalSecretGuard();
    const env = { ...process.env };

    afterEach(() => {
      process.env = { ...env };
    });

    it('without the header -> 401 AUTH_TICKET_INVALID when the secret is configured', () => {
      process.env.INTERNAL_API_SECRET = SECRET;

      let error: unknown;

      try {
        guard.canActivate(ctx(req({})));
      } catch (e) {
        error = e;
      }

      expect(error).toBeInstanceOf(UnauthorizedException);
      expect((error as UnauthorizedException).getResponse()).toMatchObject({
        code: ErrorCode.AUTH_TICKET_INVALID,
      });
    });

    it('with the right header it passes', () => {
      process.env.INTERNAL_API_SECRET = SECRET;

      expect(guard.canActivate(ctx(req({ 'x-internal-secret': SECRET })))).toBe(
        true,
      );
    });

    it('production without a configured secret denies everything (fail closed)', () => {
      process.env.NODE_ENV = 'production';
      delete process.env.INTERNAL_API_SECRET;

      expect(() =>
        guard.canActivate(ctx(req({ 'x-internal-secret': 'anything' }))),
      ).toThrow(UnauthorizedException);
    });

    it('outside production without a configured secret it is open (local dev)', () => {
      process.env.NODE_ENV = 'development';
      delete process.env.INTERNAL_API_SECRET;

      expect(guard.canActivate(ctx(req({})))).toBe(true);
    });
  });
});
