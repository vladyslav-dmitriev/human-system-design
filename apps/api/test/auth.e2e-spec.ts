/* eslint-disable @typescript-eslint/require-await, @typescript-eslint/no-unnecessary-type-assertion */
import bcrypt from 'bcrypt';
import request from 'supertest';
import type { INestApplication } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';

import { AuthController } from '../src/modules/auth/auth.controller';
import { AuthService } from '../src/modules/auth/auth.service';
import { ConfigService } from '@nestjs/config';
import { AuthRepository } from '../src/modules/auth/auth.repository';
import { UserRepository } from '../src/modules/user/user.repository';
import { EmailService } from '../src/modules/sender/email/email.service';
import { SmsService } from '../src/modules/sender/sms/sms.service';
import { CaptchaGuard } from '../src/modules/captcha/guards/captcha.guard';
import { CaptchaService } from '../src/modules/captcha/captcha.service';
import { Prisma } from '@prisma/client';
import { EmailVerificationService } from '../src/modules/sender/email/email-verification.service';
import { AuthGuard } from '../src/modules/auth/guards/jwt-auth.guard';
import { REDIS_CLIENT } from '../src/modules/redis';
import { createTestApp, sessionCookie, USER_A } from './helpers/app';
import { createFakeRedis } from './helpers/fake-redis';

const GOOD_CAPTCHA = 'captcha-ok';
const PASSWORD = 'Qa-Passw0rd-test';
// validate закрыт X-Internal-Secret: тест сам задаёт секрет, не завися от окружения (в CI он уже есть)
const INTERNAL_SECRET = 'e2e-internal-secret-0123456789-0123456789';

type StoredUser = {
  id: string;
  email: string;
  password: string;
  role: string;
  profile: { name: string; phone: string | null };
  authSettings: { twoFactorEnabled: boolean };
};

describe('AuthController (nest testing module, mocks)', () => {
  const originalInternalSecret = process.env.INTERNAL_API_SECRET;

  beforeAll(() => {
    process.env.INTERNAL_API_SECRET = INTERNAL_SECRET;
  });

  afterAll(() => {
    if (originalInternalSecret === undefined) {
      delete process.env.INTERNAL_API_SECRET;
    } else {
      process.env.INTERNAL_API_SECRET = originalInternalSecret;
    }
  });

  let app: INestApplication;
  let users: Map<string, StoredUser>;
  let redis: ReturnType<typeof createFakeRedis>;
  const sms = { sendSmsCode: jest.fn(), verifySmsCode: jest.fn() };
  const email = { sendVerificationEmail: jest.fn() };

  beforeEach(async () => {
    users = new Map();
    redis = createFakeRedis();
    sms.sendSmsCode.mockReset().mockResolvedValue(true);
    // как dev-мок Twilio: верен только 123456
    sms.verifySmsCode
      .mockReset()
      .mockImplementation(
        async ({ code }: { code: string }) => code === '123456',
      );
    email.sendVerificationEmail.mockReset().mockResolvedValue(undefined);

    const userRepo = {
      // имитация гонки: проверка и вставка разделены асинхронной паузой
      checkUserEmailExist: jest.fn(async (_id: unknown, mail: string) => {
        await new Promise((r) => setImmediate(r));
        return users.has(mail) ? { id: 'x' } : null;
      }),
      createUser: jest.fn(async (data: any) => {
        await new Promise((r) => setImmediate(r));
        // как @unique на User.email в БД
        if (users.has(data.email)) {
          throw new Prisma.PrismaClientKnownRequestError('Unique constraint', {
            code: 'P2002',
            clientVersion: 'test',
          });
        }
        const user = {
          id: `id-${users.size + 1}`,
          email: data.email,
          password: data.password,
          role: 'USER',
          profile: { name: data.name, phone: null },
          authSettings: { twoFactorEnabled: false },
        };
        users.set(data.email, user);
        return user;
      }),
    };
    const authRepo = {
      getUserCredentials: jest.fn(
        async (mail: string) => users.get(mail) ?? null,
      ),
      getUserLogin: jest.fn(async (mail: string) => users.get(mail) ?? null),
      getUserLoginById: jest.fn(
        async (id: string) =>
          [...users.values()].find((u) => u.id === id) ?? null,
      ),
    };

    app = await createTestApp({
      imports: [
        ThrottlerModule.forRoot({ throttlers: [{ limit: 10, ttl: 60000 }] }),
      ],
      controllers: [AuthController],
      providers: [
        AuthService,
        AuthGuard,
        CaptchaGuard,
        EmailVerificationService,
        { provide: ConfigService, useValue: { get: () => 'e2e-secret' } },
        { provide: REDIS_CLIENT, useValue: redis },
        { provide: APP_GUARD, useClass: ThrottlerGuard },
        { provide: AuthRepository, useValue: authRepo },
        { provide: UserRepository, useValue: userRepo },
        { provide: EmailService, useValue: email },
        { provide: SmsService, useValue: sms },
        {
          provide: CaptchaService,
          useValue: {
            verify: jest.fn(async (t: string) => t === GOOD_CAPTCHA),
          },
        },
      ],
    });
  });

  afterEach(() => app.close());

  const register = (body: Record<string, unknown>) =>
    request(app.getHttpServer()).post('/service-auth/register').send(body);
  const login = (body: Record<string, unknown>) =>
    request(app.getHttpServer()).post('/service-auth/login').send(body);
  const validate = (body: Record<string, unknown>) =>
    request(app.getHttpServer())
      .post('/service-auth/validate')
      .set('X-Internal-Secret', INTERNAL_SECRET)
      .send(body);
  const verify = (body: Record<string, unknown>) =>
    request(app.getHttpServer()).post('/service-auth/verify-otp').send(body);

  const validRegister = (over: Record<string, unknown> = {}) => ({
    name: 'QA User',
    email: `qa-${Date.now()}@example.test`,
    password: PASSWORD,
    locale: 'en',
    captchaToken: GOOD_CAPTCHA,
    ...over,
  });

  const validLogin = (over: Record<string, unknown> = {}) => ({
    email: 'seed@example.test',
    password: PASSWORD,
    captchaToken: GOOD_CAPTCHA,
    ...over,
  });

  async function seedUser(over: Partial<StoredUser> = {}) {
    const user: StoredUser = {
      id: 'u-1',
      email: 'seed@example.test',
      password: await bcrypt.hash(PASSWORD, 4),
      role: 'USER',
      profile: { name: 'Seed', phone: '+380501234567' },
      authSettings: { twoFactorEnabled: false },
      ...over,
    };
    users.set(user.email, user);
    return user;
  }

  describe('POST /service-auth/register', () => {
    it('without captcha -> 403', async () => {
      const { captchaToken: _c, ...body } = validRegister();
      const res = await register(body).expect(403);
      expect(res.body).toMatchObject({
        statusCode: 403,
        error: 'Forbidden',
        code: 'FORBIDDEN',
      });
    });

    it('invalid captcha -> 403', async () => {
      await register(validRegister({ captchaToken: 'nope' })).expect(403);
    });

    it('captcha via x-captcha-token header is accepted by the guard but DTO still requires body captchaToken -> 400', async () => {
      const { captchaToken: _c, ...body } = validRegister();
      const res = await register(body)
        .set('x-captcha-token', GOOD_CAPTCHA)
        .expect(400);
      expect(res.body.message).toContain('captchaToken must be a string');
    });

    it('happy path -> 201 {success:true}, signed-token mail requested, password hashed', async () => {
      const body = validRegister();
      const res = await register(body).expect(201);
      expect(res.body).toEqual({ success: true });
      expect(email.sendVerificationEmail).toHaveBeenCalledTimes(1);
      expect(users.get(body.email as string)?.password).not.toBe(PASSWORD);
    });

    it('email is stored trimmed and lowercased; the same email in another case is a duplicate', async () => {
      await register(
        validRegister({ email: '  Mixed.Case@Example.TEST ' }),
      ).expect(201);
      expect([...users.keys()]).toEqual(['mixed.case@example.test']);

      const res = await register(
        validRegister({ email: 'MIXED.case@example.test' }),
      ).expect(409);
      expect(res.body.code).toBe('AUTH_EMAIL_TAKEN');
    });

    it.each([
      ['empty body', {}],
      ['no email', { email: undefined }],
      ['bad email', { email: 'not-an-email' }],
      ['non-string name', { name: 123 }],
      ['unsupported locale', { locale: 'fr' }],
      ['password not a string', { password: 12345678 }],
      ['unknown extra field (forbidNonWhitelisted)', { isAdmin: true }],
      ['role escalation attempt', { role: 'ADMIN' }],
    ])('invalid DTO: %s -> 400 with readable message', async (_n, over) => {
      const base =
        _n === 'empty body'
          ? { captchaToken: GOOD_CAPTCHA }
          : validRegister(over);
      const res = await register(base).expect(400);
      expect(res.body.statusCode).toBe(400);
      expect(res.body.error).toBe('Bad Request');
      expect(res.body.code).toBe('VALIDATION_FAILED');
      expect(Array.isArray(res.body.message)).toBe(true);
      expect(res.body.message.length).toBeGreaterThan(0);
    });

    it('extra field message names the field', async () => {
      const res = await register(validRegister({ isAdmin: true })).expect(400);
      expect(res.body.message).toContain('property isAdmin should not exist');
    });

    it('double registration (sequential): second one -> 409 AUTH_EMAIL_TAKEN, one account', async () => {
      const body = validRegister({ email: 'dup@example.test' });
      await register(body).expect(201);
      const res = await register(body).expect(409);
      expect(res.body).toMatchObject({
        statusCode: 409,
        code: 'AUTH_EMAIL_TAKEN',
      });
      expect(users.size).toBe(1);
    });

    it('double registration (parallel): exactly one account, one 201 and one 409 (not 500)', async () => {
      const body = validRegister({ email: 'race@example.test' });
      const [a, b] = await Promise.all([register(body), register(body)]);
      expect(users.size).toBe(1);
      expect([a.status, b.status].sort()).toEqual([201, 409]);
    });

    it.each([['a'], ['1234567']])(
      'password %p (shorter than 8) -> 400',
      async (password) => {
        await register(validRegister({ password })).expect(400);
      },
    );

    it('password boundary: 8 chars ok, 72 bytes ok, 73 bytes -> 400', async () => {
      await register(
        validRegister({ email: 'p8@example.test', password: '12345678' }),
      ).expect(201);
      await register(
        validRegister({ email: 'p72@example.test', password: 'a'.repeat(72) }),
      ).expect(201);
      await register(
        validRegister({ email: 'p73@example.test', password: 'a'.repeat(73) }),
      ).expect(400);
    });

    it('password limit is counted in UTF-8 bytes: 37 two-byte chars (74 bytes) -> 400', async () => {
      await register(validRegister({ password: 'é'.repeat(37) })).expect(400);
      await register(
        validRegister({ email: 'ok36@example.test', password: 'é'.repeat(36) }),
      ).expect(201);
    });

    it('name boundary: 100 chars ok, 101 -> 400, 10k -> 400', async () => {
      await register(
        validRegister({ email: 'n100@example.test', name: 'x'.repeat(100) }),
      ).expect(201);
      await register(validRegister({ name: 'x'.repeat(101) })).expect(400);
      await register(validRegister({ name: 'x'.repeat(10_000) })).expect(400);
    });

    it('the response never contains the password or a verification token', async () => {
      const res = await register(validRegister()).expect(201);
      expect(JSON.stringify(res.body)).not.toMatch(/password|token/i);
    });
  });

  describe('POST /service-auth/login', () => {
    it('without captcha -> 403', async () => {
      await login({ email: 'a@example.test', password: 'x' }).expect(403);
    });

    it('invalid DTO -> 400', async () => {
      const res = await login(validLogin({ email: 'bad' })).expect(400);
      expect(res.body.message).toContain('email must be an email');
    });

    it('extra field -> 400', async () => {
      await login(validLogin({ remember: 1 })).expect(400);
    });

    it('rate limit: 11th login in a minute -> 429 RATE_LIMITED (10/min)', async () => {
      const body = validLogin({ email: 'a@example.test', password: 'x' });
      for (let i = 0; i < 10; i++) {
        const r = await login(body);
        expect(r.status).not.toBe(429);
      }
      const res = await login(body).expect(429);
      expect(res.body).toMatchObject({ statusCode: 429, code: 'RATE_LIMITED' });
    });

    it('wrong password -> 401 AUTH_INVALID_CREDENTIALS with a JSON body, no ticket', async () => {
      await seedUser();
      const res = await login(validLogin({ password: 'wrong' }));
      expect(res.status).toBe(401);
      expect(res.body).toMatchObject({
        statusCode: 401,
        code: 'AUTH_INVALID_CREDENTIALS',
      });
      expect(res.body.loginTicket).toBeUndefined();
    });

    it('unknown email gives exactly the same response as a wrong password (no user enumeration)', async () => {
      await seedUser();
      const wrong = await login(validLogin({ password: 'wrong' }));
      const unknown = await login(validLogin({ email: 'nobody@example.test' }));
      expect(unknown.status).toBe(wrong.status);
      expect(unknown.body).toEqual(wrong.body);
    });

    it('without 2FA -> 200 {twoFactorRequired:false, loginTicket}, no SMS', async () => {
      await seedUser();
      const res = await login(validLogin()).expect(200);
      expect(res.body.twoFactorRequired).toBe(false);
      expect(typeof res.body.loginTicket).toBe('string');
      expect(res.body.loginTicket.length).toBeGreaterThanOrEqual(43);
      expect(res.body.user).toBeUndefined();
      expect(sms.sendSmsCode).not.toHaveBeenCalled();
    });

    it('email is normalized: "  SEED@Example.TEST " logs in', async () => {
      await seedUser();
      await login(validLogin({ email: '  SEED@Example.TEST ' })).expect(200);
    });

    it('user with 2FA gets an SMS and NO ticket: password alone is not enough', async () => {
      await seedUser({ authSettings: { twoFactorEnabled: true } });
      const res = await login(validLogin()).expect(200);
      expect(res.body).toEqual({
        twoFactorRequired: true,
        phoneMasked: '**********67',
        otpChallenge: expect.stringMatching(/^[A-Za-z0-9_-]{43}$/),
      });
      expect(sms.sendSmsCode).toHaveBeenCalledWith({
        phoneNumber: '+380501234567',
        userId: 'u-1',
      });
      expect(JSON.stringify(res.body)).not.toContain('+380501234567');
      // в Redis только sha256 челленджа
      expect(
        [...redis.store.keys()].some((k) =>
          k.includes(res.body.otpChallenge as string),
        ),
      ).toBe(false);
    });
  });

  describe('POST /service-auth/validate (loginTicket -> user, only called by the web server)', () => {
    it('missing / short ticket -> 400', async () => {
      await validate({}).expect(400);
      await validate({ loginTicket: 'short' }).expect(400);
    });

    it('the old contract {email, password} is rejected: validate no longer checks passwords', async () => {
      await seedUser();
      const res = await validate({
        email: 'seed@example.test',
        password: PASSWORD,
      });
      expect(res.status).toBe(400);
      expect(res.body.user).toBeUndefined();
    });

    it('a forged ticket -> 401 AUTH_TICKET_INVALID', async () => {
      const res = await validate({ loginTicket: 'x'.repeat(43) }).expect(401);
      expect(res.body).toMatchObject({ code: 'AUTH_TICKET_INVALID' });
      expect(res.body.user).toBeUndefined();
    });

    it('login -> validate returns the user without sensitive fields', async () => {
      await seedUser();
      const { loginTicket } = (await login(validLogin()).expect(200)).body;
      const res = await validate({ loginTicket }).expect(200);
      expect(res.body.user).toEqual({
        id: 'u-1',
        name: 'Seed',
        email: 'seed@example.test',
        role: 'USER',
        sessionVersion: 0,
      });
    });

    it('validate returns the current sessionVersion from Redis', async () => {
      await seedUser();
      redis.store.set('session-version:u-1', '3');
      const { loginTicket } = (await login(validLogin()).expect(200)).body;
      const res = await validate({ loginTicket }).expect(200);
      expect(res.body.user.sessionVersion).toBe(3);
    });

    it('the ticket is one-time: the second validate -> 401', async () => {
      await seedUser();
      const { loginTicket } = (await login(validLogin()).expect(200)).body;
      await validate({ loginTicket }).expect(200);
      const res = await validate({ loginTicket }).expect(401);
      expect(res.body.code).toBe('AUTH_TICKET_INVALID');
    });

    it('parallel validate with one ticket: exactly one 200 (atomic GETDEL)', async () => {
      await seedUser();
      const { loginTicket } = (await login(validLogin()).expect(200)).body;
      const results = await Promise.all([
        validate({ loginTicket }),
        validate({ loginTicket }),
        validate({ loginTicket }),
      ]);
      expect(results.map((r) => r.status).sort()).toEqual([200, 401, 401]);
    });

    it('an expired ticket (removed from Redis) -> 401', async () => {
      await seedUser();
      const { loginTicket } = (await login(validLogin()).expect(200)).body;
      redis.store.clear();
      await validate({ loginTicket }).expect(401);
    });

    it('the ticket is stored with a 300 s TTL and not in plain text', async () => {
      await seedUser();
      const { loginTicket } = (await login(validLogin()).expect(200)).body;
      const keys = [...redis.store.keys()].filter((k) =>
        k.startsWith('login-ticket:'),
      );
      expect(keys).toHaveLength(1);
      expect(keys[0]).not.toContain(loginTicket);
      expect(redis.ttl.get(keys[0])).toBe(300);
    });
  });

  describe('POST /service-auth/verify-otp', () => {
    const FORGED = 'f'.repeat(43);
    const otp = (otpChallenge: string, code: string) =>
      verify({ otpChallenge, code });
    /** login с 2FA -> otpChallenge */
    const startOtp = async () => {
      await seedUser({ authSettings: { twoFactorEnabled: true } });
      const res = await login(validLogin()).expect(200);

      return res.body.otpChallenge as string;
    };

    it('does not require a captcha (it was checked at login)', async () => {
      const res = await otp(FORGED, '000000');
      expect(res.status).not.toBe(403);
    });

    it.each([['12345'], [''], [123456], ['1234567']])(
      'code %p of wrong shape -> 400',
      async (code) => {
        const res = await verify({ otpChallenge: FORGED, code });
        expect(res.status).toBe(400);
      },
    );

    it('the old contract {email, code} is rejected (no otpChallenge)', async () => {
      await startOtp();
      await verify({ email: 'seed@example.test', code: '123456' }).expect(400);
    });

    it('rejects a body that carries a password', async () => {
      const challenge = await startOtp();
      await verify({
        otpChallenge: challenge,
        code: '123456',
        password: PASSWORD,
      }).expect(400);
    });

    it('a forged challenge: even the right code gives 400 AUTH_INVALID_OTP and the provider is not asked', async () => {
      await seedUser({ authSettings: { twoFactorEnabled: true } });
      const res = await otp(FORGED, '123456').expect(400);
      expect(res.body.code).toBe('AUTH_INVALID_OTP');
      expect(res.body.loginTicket).toBeUndefined();
      expect(sms.verifySmsCode).not.toHaveBeenCalled();
    });

    it('a failed password step issues no challenge', async () => {
      await seedUser({ authSettings: { twoFactorEnabled: true } });
      const res = await login(validLogin({ password: 'wrong' })).expect(401);
      expect(res.body.otpChallenge).toBeUndefined();
    });

    it('full 2FA flow: login -> verify-otp -> loginTicket -> validate -> user', async () => {
      const challenge = await startOtp();
      const res = await otp(challenge, '123456').expect(200);
      expect(typeof res.body.loginTicket).toBe('string');
      expect(Object.keys(res.body)).toEqual(['loginTicket']);

      const user = await validate({ loginTicket: res.body.loginTicket }).expect(
        200,
      );
      expect(user.body.user).toMatchObject({
        id: 'u-1',
        email: 'seed@example.test',
      });
    });

    it('wrong code -> 400 AUTH_INVALID_OTP, no ticket', async () => {
      const challenge = await startOtp();
      const res = await otp(challenge, '000000').expect(400);
      expect(res.body).toMatchObject({ code: 'AUTH_INVALID_OTP' });
      expect(res.body.loginTicket).toBeUndefined();
    });

    it('the challenge is one-time: a second verify-otp after success is rejected', async () => {
      const challenge = await startOtp();
      await otp(challenge, '123456').expect(200);
      await otp(challenge, '123456').expect(400);
    });

    it('parallel verify-otp with the right code: exactly one ticket', async () => {
      const challenge = await startOtp();
      const results = await Promise.all([
        otp(challenge, '123456'),
        otp(challenge, '123456'),
        otp(challenge, '123456'),
      ]);
      expect(results.filter((r) => r.status === 200)).toHaveLength(1);
    });

    it('attempts are limited to 5 per challenge: the 6th try with the RIGHT code is refused', async () => {
      const challenge = await startOtp();

      for (let i = 0; i < 5; i++) {
        await otp(challenge, '000000').expect(400);
      }
      // 6-й запрос в минуту: отказ от throttler (429) или от счётчика (400);
      // билет выдан быть не должен
      const res = await otp(challenge, '123456');
      expect([400, 429]).toContain(res.status);
      expect(res.body.loginTicket).toBeUndefined();
    });

    it('a repeated login gives a NEW challenge and does not reset the old counter', async () => {
      const first = await startOtp();
      await otp(first, '000000').expect(400);
      const second = (await login(validLogin()).expect(200)).body
        .otpChallenge as string;
      expect(second).not.toBe(first);
      const attemptsKeys = [...redis.store.keys()].filter((k) =>
        k.startsWith('login-otp-attempts:'),
      );
      expect(attemptsKeys).toHaveLength(1);
      expect(redis.store.get(attemptsKeys[0])).toBe('1');
      expect(redis.ttl.get(attemptsKeys[0])).toBe(300);
    });

    it('rate limit by route: 6th request in a minute -> 429', async () => {
      for (let i = 0; i < 5; i++) await otp(FORGED, '000000');
      const res = await otp(FORGED, '000000').expect(429);
      expect(res.body.code).toBe('RATE_LIMITED');
    });
  });

  describe('POST /service-auth/logout', () => {
    it('without a session -> 401 UNAUTHORIZED', async () => {
      const res = await request(app.getHttpServer())
        .post('/service-auth/logout')
        .expect(401);
      expect(res.body.code).toBe('UNAUTHORIZED');
    });

    it('with a session -> {success:true} and the session is revoked (INCR session-version)', async () => {
      const cookie = await sessionCookie(USER_A);
      const res = await request(app.getHttpServer())
        .post('/service-auth/logout')
        .set('Cookie', cookie)
        .expect(200);
      expect(res.body).toEqual({ success: true });
      expect(redis.store.get(`session-version:${USER_A.id}`)).toBe('1');

      // старая cookie (sessionVersion 0) больше не принимается
      await request(app.getHttpServer())
        .post('/service-auth/logout')
        .set('Cookie', cookie)
        .expect(401);
    });
  });
});
