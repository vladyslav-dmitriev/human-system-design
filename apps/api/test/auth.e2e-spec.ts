/* eslint-disable @typescript-eslint/require-await, @typescript-eslint/no-unnecessary-type-assertion */
import bcrypt from 'bcrypt';
import request from 'supertest';
import type { INestApplication } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';

import { AuthController } from '../src/modules/auth/auth.controller';
import { AuthService } from '../src/modules/auth/auth.service';
import { AuthRepository } from '../src/modules/auth/auth.repository';
import { UserRepository } from '../src/modules/user/user.repository';
import { EmailService } from '../src/modules/sender/email/email.service';
import { SmsService } from '../src/modules/sender/sms/sms.service';
import { CaptchaGuard } from '../src/modules/captcha/guards/captcha.guard';
import { CaptchaService } from '../src/modules/captcha/captcha.service';
import { createTestApp } from './helpers/app';

const GOOD_CAPTCHA = 'captcha-ok';
const PASSWORD = 'Qa-Passw0rd-test';

type StoredUser = {
  id: string;
  email: string;
  password: string;
  role: string;
  profile: { name: string; phone: string | null };
  authSettings: { twoFactorEnabled: boolean };
};

describe('AuthController (nest testing module, mocks)', () => {
  let app: INestApplication;
  let users: Map<string, StoredUser>;
  const sms = { sendSmsCode: jest.fn(), verifySmsCode: jest.fn() };
  const email = { sendVerificationEmail: jest.fn() };

  beforeEach(async () => {
    users = new Map();
    sms.sendSmsCode.mockReset().mockResolvedValue(true);
    sms.verifySmsCode.mockReset().mockResolvedValue(false);
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
        if (users.has(data.email)) throw new Error('P2002 unique');
        users.set(data.email, {
          id: `id-${users.size + 1}`,
          email: data.email,
          password: data.password,
          role: 'USER',
          profile: { name: data.name, phone: null },
          authSettings: { twoFactorEnabled: false },
        });
      }),
    };
    const authRepo = {
      getUserCredentials: jest.fn(
        async (mail: string) => users.get(mail) ?? null,
      ),
      getUserLogin: jest.fn(async (mail: string) => users.get(mail) ?? null),
    };

    app = await createTestApp({
      imports: [
        ThrottlerModule.forRoot({ throttlers: [{ limit: 10, ttl: 60000 }] }),
      ],
      controllers: [AuthController],
      providers: [
        AuthService,
        CaptchaGuard,
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

  const validRegister = (over: Record<string, unknown> = {}) => ({
    name: 'QA User',
    email: `qa-${Date.now()}@example.test`,
    password: PASSWORD,
    locale: 'en',
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
      expect(res.body).toMatchObject({ statusCode: 403, error: 'Forbidden' });
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

    it('happy path -> 201 {success:true}, verification mail requested, password hashed', async () => {
      const body = validRegister();
      const res = await register(body).expect(201);
      expect(res.body).toEqual({ success: true });
      expect(email.sendVerificationEmail).toHaveBeenCalledTimes(1);
      expect(users.get(body.email as string)?.password).not.toBe(PASSWORD);
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
      const res = await register(_n === 'empty body' ? base : base).expect(400);
      expect(res.body.statusCode).toBe(400);
      expect(res.body.error).toBe('Bad Request');
      expect(Array.isArray(res.body.message)).toBe(true);
      expect(res.body.message.length).toBeGreaterThan(0);
    });

    it('extra field message names the field', async () => {
      const res = await register(validRegister({ isAdmin: true })).expect(400);
      expect(res.body.message).toContain('property isAdmin should not exist');
    });

    it('double registration (sequential): second one is not created', async () => {
      const body = validRegister({ email: 'dup@example.test' });
      await register(body).expect(201);
      const res = await register(body);
      expect(users.size).toBe(1);
      expect(res.body.success).not.toBe(true);
    });

    it('double registration (parallel): exactly one account, one success', async () => {
      const body = validRegister({ email: 'race@example.test' });
      const [a, b] = await Promise.all([register(body), register(body)]);
      expect(users.size).toBe(1);
      const successes = [a.body, b.body].filter((x) => x.success === true);
      expect(successes).toHaveLength(1);
    });

    // BUG: новый, см. отчёт L2 (дубликат email отдаёт 201 + {error}, а не 409)
    it.failing(
      'duplicate email -> 409 Conflict (единый формат ошибок)',
      async () => {
        const body = validRegister({ email: 'dup2@example.test' });
        await register(body).expect(201);
        await register(body).expect(409);
      },
    );

    // BUG: новый, см. отчёт L2 (нет политики пароля при регистрации, при смене - min 8)
    it.failing('one-character password is rejected with 400', async () => {
      await register(validRegister({ password: 'a' })).expect(400);
    });

    // BUG: новый, см. отчёт L2 (нет ограничения длины name/password: bcrypt режет 72 байта, имя без лимита)
    it.failing(
      'absurdly long name (10k chars) is rejected with 400',
      async () => {
        await register(validRegister({ name: 'x'.repeat(10_000) })).expect(400);
      },
    );
  });

  describe('POST /service-auth/login', () => {
    const login = (body: Record<string, unknown>) =>
      request(app.getHttpServer()).post('/service-auth/login').send(body);

    it('without captcha -> 403', async () => {
      await login({ email: 'a@example.test', password: 'x' }).expect(403);
    });

    it('invalid DTO -> 400', async () => {
      const res = await login({
        email: 'bad',
        password: 'x',
        captchaToken: GOOD_CAPTCHA,
      }).expect(400);
      expect(res.body.message).toContain('email must be an email');
    });

    it('extra field -> 400', async () => {
      await login({
        email: 'a@example.test',
        password: 'x',
        captchaToken: GOOD_CAPTCHA,
        remember: 1,
      }).expect(400);
    });

    it('rate limit: 4th login in a minute -> 429', async () => {
      const body = {
        email: 'a@example.test',
        password: 'x',
        captchaToken: GOOD_CAPTCHA,
      };
      for (let i = 0; i < 3; i++) {
        const r = await login(body);
        expect(r.status).not.toBe(429);
      }
      const res = await login(body).expect(429);
      expect(res.body.statusCode).toBe(429);
    });

    // BUG: новый, см. отчёт L2 (неверный пароль -> 201 с пустым телом; web падает на response.json())
    it.failing('wrong password -> 401 with JSON error body', async () => {
      await seedUser();
      const res = await login({
        email: 'seed@example.test',
        password: 'wrong',
        captchaToken: GOOD_CAPTCHA,
      });
      expect(res.status).toBe(401);
    });

    // BUG: новый, см. отчёт L2 (условие `!phone || name` в AuthService.login: SMS 2FA на логине не запускается никогда)
    it.failing(
      'user with 2FA enabled gets an SMS code and twoFactorEnabled=true',
      async () => {
        await seedUser({ authSettings: { twoFactorEnabled: true } });
        const res = await login({
          email: 'seed@example.test',
          password: PASSWORD,
          captchaToken: GOOD_CAPTCHA,
        }).expect(201);
        expect(res.body.twoFactorEnabled).toBe(true);
        expect(sms.sendSmsCode).toHaveBeenCalled();
      },
    );
  });

  describe('POST /service-auth/validate (используется next-auth Credentials)', () => {
    const validate = (body: Record<string, unknown>) =>
      request(app.getHttpServer()).post('/service-auth/validate').send(body);

    it('missing fields -> 400', async () => {
      await validate({ email: 'a@example.test' }).expect(400);
    });

    it('unknown credentials -> no user in response (web treats as failure)', async () => {
      const res = await validate({
        email: 'nobody@example.test',
        password: 'x',
      });
      expect(res.body.user).toBeUndefined();
    });

    it('correct credentials -> response contains the user (web reads data.user)', async () => {
      await seedUser();
      const res = await validate({
        email: 'seed@example.test',
        password: PASSWORD,
      }).expect(201);
      expect(res.body.user).toMatchObject({
        id: 'u-1',
        email: 'seed@example.test',
        role: 'USER',
      });
      expect(res.body.user.password).toBeUndefined();
    });

    // BUG: новый, см. отчёт L2 (validate выдаёт пользователя по одному паролю, 2FA не проверяется)
    it.failing(
      'user with 2FA enabled: password alone must not be enough',
      async () => {
        await seedUser({ authSettings: { twoFactorEnabled: true } });
        const res = await validate({
          email: 'seed@example.test',
          password: PASSWORD,
        });
        expect(res.body.user).toBeUndefined();
      },
    );

    // BUG: новый, см. отчёт L2 (неверные данные -> 201 + {}; нужен 401)
    it.failing('wrong password -> 401', async () => {
      await seedUser();
      await validate({ email: 'seed@example.test', password: 'wrong' }).expect(
        401,
      );
    });
  });

  describe('POST /service-auth/verify-otp', () => {
    const verify = (body: Record<string, unknown>) =>
      request(app.getHttpServer()).post('/service-auth/verify-otp').send(body);

    it('without captcha -> 403', async () => {
      await verify({
        email: 'a@example.test',
        password: 'x',
        code: '123456',
      }).expect(403);
    });

    it.each([['12345'], [''], [123456]])(
      'code %p of wrong shape -> 400',
      async (code) => {
        const res = await verify({
          email: 'a@example.test',
          password: 'x',
          code,
          captchaToken: GOOD_CAPTCHA,
        });
        expect(res.status).toBe(400);
      },
    );

    // BUG: новый, см. отчёт L2 (@Length(6) без max: код из 7+ символов проходит валидацию)
    it.failing('7-digit code -> 400 (длина ровно 6)', async () => {
      await verify({
        email: 'a@example.test',
        password: 'x',
        code: '1234567',
        captchaToken: GOOD_CAPTCHA,
      }).expect(400);
    });

    it('wrong code -> no user in response', async () => {
      await seedUser({ authSettings: { twoFactorEnabled: true } });
      const res = await verify({
        email: 'seed@example.test',
        password: PASSWORD,
        code: '000000',
        captchaToken: GOOD_CAPTCHA,
      });
      expect(res.body.user).toBeUndefined();
      expect(res.body.success).not.toBe(true);
    });

    it('rate limit: 4th attempt -> 429 (brute force of 6-digit code)', async () => {
      const body = {
        email: 'seed@example.test',
        password: PASSWORD,
        code: '000000',
        captchaToken: GOOD_CAPTCHA,
      };
      for (let i = 0; i < 3; i++) await verify(body);
      await verify(body).expect(429);
    });
  });
});
