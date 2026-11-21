/* eslint-disable @typescript-eslint/require-await */
import request from 'supertest';
import type { INestApplication } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule } from '@nestjs/throttler';

import { AuthController } from '../src/modules/auth/auth.controller';
import { AuthService } from '../src/modules/auth/auth.service';
import { AuthGuard } from '../src/modules/auth/guards/jwt-auth.guard';
import { AuthRepository } from '../src/modules/auth/auth.repository';
import { UserRepository } from '../src/modules/user/user.repository';
import { EmailService } from '../src/modules/sender/email/email.service';
import { EmailVerificationService } from '../src/modules/sender/email/email-verification.service';
import { SmsService } from '../src/modules/sender/sms/sms.service';
import { CaptchaGuard } from '../src/modules/captcha/guards/captcha.guard';
import { CaptchaService } from '../src/modules/captcha/captcha.service';
import { AppThrottlerGuard } from '../src/modules/app.throttler.guard';
import { FinanceController } from '../src/modules/billing/finance/finance.controller';
import { REDIS_CLIENT } from '../src/modules/redis';
import { ConfigService } from '@nestjs/config';
import { createTestApp, sessionCookie, USER_A } from './helpers/app';
import { createFakeRedis } from './helpers/fake-redis';

const SECRET = 'internal-secret-0123456789-0123456789-xx';
const LOGIN_BODY = {
  email: 'nobody@example.test',
  password: 'x',
  captchaToken: 'ok',
};

/**
 * Реальный AppThrottlerGuard + AuthController: внутренний секрет на validate
 * и ключи throttler для service-auth.
 */
describe('service-auth: internal secret and throttler keys', () => {
  let app: INestApplication;
  const env = { ...process.env };
  const http = () => request(app.getHttpServer());

  beforeEach(async () => {
    process.env.INTERNAL_API_SECRET = SECRET;
    delete process.env.NODE_ENV;
    const redis = createFakeRedis();

    app = await createTestApp({
      imports: [
        ThrottlerModule.forRoot({ throttlers: [{ limit: 100, ttl: 60000 }] }),
      ],
      controllers: [AuthController],
      providers: [
        AuthService,
        AuthGuard,
        CaptchaGuard,
        { provide: ConfigService, useValue: { get: () => 'x' } },
        { provide: REDIS_CLIENT, useValue: redis },
        { provide: APP_GUARD, useClass: AppThrottlerGuard },
        {
          provide: AuthRepository,
          useValue: {
            getUserCredentials: async () => null,
            getUserLogin: async () => null,
            getUserLoginById: async () => null,
          },
        },
        { provide: UserRepository, useValue: {} },
        { provide: EmailService, useValue: {} },
        { provide: EmailVerificationService, useValue: {} },
        { provide: SmsService, useValue: {} },
        {
          provide: CaptchaService,
          useValue: { verify: async () => true },
        },
      ],
    });
  });

  afterEach(async () => {
    process.env = { ...env };
    await app.close();
  });

  const ticket = { loginTicket: 'x'.repeat(43) };

  describe('POST /service-auth/validate', () => {
    it('without X-Internal-Secret -> 401 AUTH_TICKET_INVALID', async () => {
      const res = await http()
        .post('/service-auth/validate')
        .send(ticket)
        .expect(401);
      expect(res.body.code).toBe('AUTH_TICKET_INVALID');
    });

    it('with a wrong secret -> 401 AUTH_TICKET_INVALID', async () => {
      const res = await http()
        .post('/service-auth/validate')
        .set('X-Internal-Secret', 'wrong')
        .send(ticket)
        .expect(401);
      expect(res.body.code).toBe('AUTH_TICKET_INVALID');
    });

    it('with the right secret a forged ticket is still 401 AUTH_TICKET_INVALID (the guard passed)', async () => {
      const res = await http()
        .post('/service-auth/validate')
        .set('X-Internal-Secret', SECRET)
        .send(ticket)
        .expect(401);
      expect(res.body.code).toBe('AUTH_TICKET_INVALID');
    });

    it('is not IP-limited: 150 calls with the secret never give 429', async () => {
      for (let i = 0; i < 150; i++) {
        const res = await http()
          .post('/service-auth/validate')
          .set('X-Internal-Secret', SECRET)
          .send(ticket);
        expect(res.status).toBe(401);
      }
    });

    it('is not IP-limited even without the secret (cheap 401, never 429)', async () => {
      for (let i = 0; i < 120; i++) {
        const res = await http().post('/service-auth/validate').send(ticket);
        expect(res.status).toBe(401);
      }
    });
  });

  describe('throttler key for service-auth', () => {
    const login = () => http().post('/service-auth/login').send(LOGIN_BODY);

    it('login is limited to 10 per minute by IP', async () => {
      for (let i = 0; i < 10; i++) {
        expect((await login()).status).toBe(401);
      }
      const res = await login().expect(429);
      expect(res.body.code).toBe('RATE_LIMITED');
    });

    it('rotating forged session cookies does not give a fresh counter', async () => {
      for (let i = 0; i < 10; i++) {
        await login().set('Cookie', `authjs.session-token=forged-${i}`);
      }
      await login()
        .set('Cookie', 'authjs.session-token=forged-new')
        .expect(429);
    });

    it('even a VALID session cookie does not move service-auth to a user:<id> counter', async () => {
      const cookie = await sessionCookie(USER_A);

      for (let i = 0; i < 10; i++) {
        await login().set('Cookie', cookie);
      }
      // другой «пользователь» с того же IP делит тот же счётчик
      await login().expect(429);
    });

    it('X-Client-IP with the right secret gives each real client its own counter', async () => {
      const as = (ip: string) =>
        login().set('X-Internal-Secret', SECRET).set('X-Client-IP', ip);

      for (let i = 0; i < 10; i++) await as('203.0.113.1');
      await as('203.0.113.1').expect(429);
      // другой клиент за тем же сервером web не затронут
      expect((await as('203.0.113.2')).status).toBe(401);
    });

    it('X-Client-IP without the secret is ignored: spoofing does not reset the limit', async () => {
      for (let i = 0; i < 10; i++) {
        await login().set('X-Client-IP', `203.0.113.${i + 1}`);
      }
      await login().set('X-Client-IP', '198.51.100.99').expect(429);
    });
  });

  it('Stripe webhook is exempt from throttling (metadata)', () => {
    const handler = FinanceController.prototype.handleStripeWebhook;

    expect(Reflect.getMetadata('THROTTLER:SKIPdefault', handler)).toBe(true);
  });
});
