/* eslint-disable @typescript-eslint/require-await */
import bcrypt from 'bcrypt';
import request from 'supertest';
import type { INestApplication } from '@nestjs/common';

import { UsersController } from '../src/modules/user/users.controller';
import { UserService } from '../src/modules/user/user.service';
import { UserRepository } from '../src/modules/user/user.repository';
import { SmsService } from '../src/modules/sender/sms/sms.service';
import { REDIS_CLIENT } from '../src/modules/redis';
import { createTestApp, sessionCookie, USER_A, USER_B } from './helpers/app';
import { createFakeRedis } from './helpers/fake-redis';

const OLD_PASSWORD = 'Old-Passw0rd-qa';

describe('UsersController (nest testing module, mocks)', () => {
  let app: INestApplication;
  let cookieA: string;
  let passwordHash: string;
  const repo = {
    getUserById: jest.fn(),
    checkUserEmailExist: jest.fn(),
    updateUser: jest.fn(),
    updateUserEmail: jest.fn(),
    updateUserTwoFactor: jest.fn(),
  };
  const sms = { verifySmsCode: jest.fn() };
  let redis: ReturnType<typeof createFakeRedis>;

  beforeAll(async () => {
    cookieA = await sessionCookie(USER_A);
    passwordHash = await bcrypt.hash(OLD_PASSWORD, 4);
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  beforeEach(async () => {
    Object.values(repo).forEach((m) => m.mockReset());
    sms.verifySmsCode.mockReset();
    redis = createFakeRedis();
    repo.getUserById.mockImplementation(async (id: string) => ({
      id,
      email: `${id}@example.test`,
      password: passwordHash,
      role: 'USER',
      profile: { name: 'QA', phone: '+380501234567' },
      authSettings: {
        isVerified: false,
        verifiedToken: 'secret-verify-token', // legacy-поле в БД: наружу отдаваться не должно
        twoFactorEnabled: false,
      },
      userBillingProfile: { stripeCustomerId: 'cus_test' },
    }));

    app = await createTestApp({
      controllers: [UsersController],
      providers: [
        UserService,
        { provide: UserRepository, useValue: repo },
        { provide: SmsService, useValue: sms },
        { provide: REDIS_CLIENT, useValue: redis },
      ],
    });
  });

  afterEach(() => app.close());

  const http = () => request(app.getHttpServer());

  describe('auth (401 without a session)', () => {
    it.each([
      ['get', '/user/profile'],
      ['patch', '/user/profile'],
      ['patch', '/user/profile/password'],
      ['put', '/user/profile/phone'],
      ['post', '/user/profile/2fa'],
    ])('%s %s without cookie -> 401', async (method, url) => {
      const res = await (http() as any)[method](url).send({}).expect(401);
      expect(res.body.statusCode).toBe(401);
    });

    it('garbage / tampered cookie -> 401', async () => {
      await http()
        .get('/user/profile')
        .set('Cookie', 'authjs.session-token=garbage')
        .expect(401);
      await http()
        .get('/user/profile')
        .set('Cookie', `${cookieA}x`)
        .expect(401);
    });

    it('token signed with another secret -> 401', async () => {
      const { encode } = await import('@auth/core/jwt');
      const forged = await encode({
        token: { sub: 'admin', id: 'admin', role: 'ADMIN' },
        secret: 'some-other-secret-0123456789abcdef',
        salt: 'authjs.session-token',
      });
      await http()
        .get('/user/profile')
        .set('Cookie', `authjs.session-token=${forged}`)
        .expect(401);
    });
  });

  describe('GET /user/profile', () => {
    it('returns only the caller profile, never the password hash', async () => {
      const res = await http()
        .get('/user/profile')
        .set('Cookie', cookieA)
        .expect(200);
      expect(repo.getUserById).toHaveBeenCalledWith(USER_A.id);
      expect(res.body.email).toBe(`${USER_A.id}@example.test`);
      expect(JSON.stringify(res.body)).not.toContain(passwordHash);
      expect(res.body.password).toBeUndefined();
    });

    it('unknown user -> 404', async () => {
      repo.getUserById.mockResolvedValue(null);
      await http().get('/user/profile').set('Cookie', cookieA).expect(404);
    });

    it('does not leak the email verification token', async () => {
      const res = await http()
        .get('/user/profile')
        .set('Cookie', cookieA)
        .expect(200);
      expect(JSON.stringify(res.body)).not.toContain('secret-verify-token');
      expect(res.body.authSettings.verifiedToken).toBeUndefined();
    });

    it('profile and authSettings are exposed as objects with the declared fields only', async () => {
      const res = await http()
        .get('/user/profile')
        .set('Cookie', cookieA)
        .expect(200);
      expect(res.body).toEqual({
        email: `${USER_A.id}@example.test`,
        profile: { name: 'QA', phone: '+380501234567' },
        authSettings: { isVerified: false, twoFactorEnabled: false },
      });
    });
  });

  describe('PATCH /user/profile (change email)', () => {
    const patch = (body: Record<string, unknown>) =>
      http().patch('/user/profile').set('Cookie', cookieA).send(body);

    it('happy path: normalizes email (trim + lowercase), responds {success:true}', async () => {
      repo.checkUserEmailExist.mockResolvedValue(null);
      const res = await patch({
        email: '  New.Mail@Example.test ',
        currentPassword: OLD_PASSWORD,
      }).expect(200);
      expect(res.body).toEqual({ success: true });
      expect(repo.updateUserEmail).toHaveBeenCalledWith(
        USER_A.id,
        'new.mail@example.test',
      );
    });

    it('wrong currentPassword -> 400 USER_INVALID_PASSWORD, email is not changed (account takeover protection)', async () => {
      const res = await patch({
        email: 'attacker@example.test',
        currentPassword: 'wrong',
      }).expect(400);
      expect(res.body.code).toBe('USER_INVALID_PASSWORD');
      expect(repo.updateUserEmail).not.toHaveBeenCalled();
    });

    it('currentPassword is mandatory', async () => {
      await patch({ email: 'attacker@example.test' }).expect(400);
      expect(repo.updateUserEmail).not.toHaveBeenCalled();
    });

    it('email already used by another user -> 409 USER_EMAIL_TAKEN and no update', async () => {
      repo.checkUserEmailExist.mockResolvedValue({ id: USER_B.id });
      const res = await patch({
        email: USER_B.email,
        currentPassword: OLD_PASSWORD,
      }).expect(409);
      expect(res.body.code).toBe('USER_EMAIL_TAKEN');
      expect(repo.updateUserEmail).not.toHaveBeenCalled();
    });

    it.each([
      [{ currentPassword: OLD_PASSWORD }],
      [{ email: '', currentPassword: OLD_PASSWORD }],
      [{ email: 'nope', currentPassword: OLD_PASSWORD }],
      [{ email: 5, currentPassword: OLD_PASSWORD }],
      [{ email: 'a@example.test', currentPassword: 123 }],
      [
        {
          email: 'a@example.test',
          currentPassword: OLD_PASSWORD,
          id: 'user-b',
        },
      ],
    ])('invalid body %j -> 400', async (body) => {
      const res = await patch(body).expect(400);
      expect(res.body.statusCode).toBe(400);
      expect(res.body.code).toBe('VALIDATION_FAILED');
      expect(res.body.message.length).toBeGreaterThan(0);
    });

    it('cannot target another user via body id (whitelist)', async () => {
      const res = await patch({
        email: 'a@example.test',
        currentPassword: OLD_PASSWORD,
        id: USER_B.id,
      }).expect(400);
      expect(res.body.message).toContain('property id should not exist');
      expect(repo.updateUserEmail).not.toHaveBeenCalled();
    });
  });

  describe('PATCH /user/profile/password', () => {
    const patch = (body: Record<string, unknown>) =>
      http().patch('/user/profile/password').set('Cookie', cookieA).send(body);

    it('happy path hashes the new password', async () => {
      await patch({
        currentPassword: OLD_PASSWORD,
        newPassword: 'New-Passw0rd-qa',
      }).expect(200);
      const [, data] = repo.updateUser.mock.calls[0];
      expect(data.password).not.toBe('New-Passw0rd-qa');
      expect(await bcrypt.compare('New-Passw0rd-qa', data.password)).toBe(true);
    });

    it('happy path responds {success:true}', async () => {
      const res = await patch({
        currentPassword: OLD_PASSWORD,
        newPassword: 'New-Passw0rd-qa',
      }).expect(200);
      expect(res.body).toEqual({ success: true });
    });

    it('wrong current password -> 400 USER_INVALID_PASSWORD, nothing saved', async () => {
      const res = await patch({
        currentPassword: 'wrong',
        newPassword: 'New-Passw0rd-qa',
      }).expect(400);
      expect(res.body.code).toBe('USER_INVALID_PASSWORD');
      expect(repo.updateUser).not.toHaveBeenCalled();
    });

    it('new == old -> 400', async () => {
      await patch({
        currentPassword: OLD_PASSWORD,
        newPassword: OLD_PASSWORD,
      }).expect(400);
    });

    it('7 chars -> 400, 8 chars -> accepted (boundary)', async () => {
      await patch({
        currentPassword: OLD_PASSWORD,
        newPassword: '1234567',
      }).expect(400);
      await patch({
        currentPassword: OLD_PASSWORD,
        newPassword: '12345678',
      }).expect(200);
    });

    it.each([
      [{}],
      [{ currentPassword: OLD_PASSWORD }],
      [{ newPassword: '12345678' }],
      [{ currentPassword: OLD_PASSWORD, newPassword: '12345678', x: 1 }],
    ])('invalid body %j -> 400', async (body) => {
      await patch(body).expect(400);
    });

    it('password boundary: 72 bytes ok, 73 bytes -> 400, 37 two-byte chars (74 bytes) -> 400', async () => {
      await patch({
        currentPassword: OLD_PASSWORD,
        newPassword: 'a'.repeat(72),
      }).expect(200);
      await patch({
        currentPassword: OLD_PASSWORD,
        newPassword: 'a'.repeat(73),
      }).expect(400);
      await patch({
        currentPassword: OLD_PASSWORD,
        newPassword: 'é'.repeat(37),
      }).expect(400);
    });

    it('non-string newPassword (number) -> 400', async () => {
      await patch({
        currentPassword: OLD_PASSWORD,
        newPassword: 123456789,
      }).expect(400);
    });
  });

  describe('PUT /user/profile/phone', () => {
    const put = (body: Record<string, unknown>) =>
      http().put('/user/profile/phone').set('Cookie', cookieA).send(body);

    it('stores a pending phone for the caller only (until the code is confirmed)', async () => {
      const res = await put({ phone: '+380671112233' }).expect(200);
      expect(res.body).toEqual({ success: true });
      expect(redis.store.get(`pending-phone:${USER_A.id}`)).toBe(
        '+380671112233',
      );
      expect(repo.updateUserTwoFactor).not.toHaveBeenCalled();
      expect(repo.updateUser).not.toHaveBeenCalled();
    });

    it.each([
      [{}],
      [{ phone: 'abc' }],
      [{ phone: 5 }],
      [{ phone: '+380671112233', id: 'x' }],
    ])('invalid body %j -> 400', async (body) => {
      await put(body).expect(400);
    });
  });

  describe('POST /user/profile/2fa', () => {
    const post = (body: Record<string, unknown>) =>
      http().post('/user/profile/2fa').set('Cookie', cookieA).send(body);
    const enable = {
      phone: '+380501234567',
      code: '123456',
      twoFactorEnabled: true,
    };

    it('valid code enables 2FA for the caller only -> 200 {success:true}', async () => {
      sms.verifySmsCode.mockResolvedValue(true);
      const res = await post(enable).expect(200);
      expect(res.body).toEqual({ success: true });
      expect(repo.updateUserTwoFactor).toHaveBeenCalledWith({
        userId: USER_A.id,
        phone: '+380501234567',
        twoFactorEnabled: true,
      });
    });

    it('wrong code -> 400 USER_INVALID_OTP so that the client can show an error, settings unchanged', async () => {
      sms.verifySmsCode.mockResolvedValue(false);
      const res = await post({ ...enable, code: '000000' }).expect(400);
      expect(res.body.code).toBe('USER_INVALID_OTP');
      expect(repo.updateUserTwoFactor).not.toHaveBeenCalled();
    });

    it('SMS provider failure does not enable 2FA (fail closed) -> 400', async () => {
      sms.verifySmsCode.mockRejectedValue(new Error('twilio down'));
      await post(enable).expect(400);
      expect(repo.updateUserTwoFactor).not.toHaveBeenCalled();
    });

    it('enrolment flow: PUT phone, then 2FA with the same phone enables it and stores THAT phone', async () => {
      sms.verifySmsCode.mockResolvedValue(true);
      await http()
        .put('/user/profile/phone')
        .set('Cookie', cookieA)
        .send({ phone: '+380671112233' })
        .expect(200);
      await post({ ...enable, phone: '+380671112233' }).expect(200);
      expect(sms.verifySmsCode).toHaveBeenCalledWith({
        phoneNumber: '+380671112233',
        code: '123456',
      });
      expect(repo.updateUserTwoFactor).toHaveBeenCalledWith({
        userId: USER_A.id,
        phone: '+380671112233',
        twoFactorEnabled: true,
      });
      expect(redis.store.has(`pending-phone:${USER_A.id}`)).toBe(false);
    });

    it('a phone in the body that differs from the one the SMS went to is refused, code is not even checked', async () => {
      await http()
        .put('/user/profile/phone')
        .set('Cookie', cookieA)
        .send({ phone: '+380671112233' })
        .expect(200);
      sms.verifySmsCode.mockResolvedValue(true);
      const res = await post({ ...enable, phone: '+380999999999' }).expect(400);
      expect(res.body.code).toBe('USER_INVALID_OTP');
      expect(sms.verifySmsCode).not.toHaveBeenCalled();
      expect(repo.updateUserTwoFactor).not.toHaveBeenCalled();
    });

    it('disabling 2FA requires a valid code as well', async () => {
      sms.verifySmsCode.mockResolvedValue(false);
      await post({ ...enable, twoFactorEnabled: false }).expect(400);
      expect(repo.updateUserTwoFactor).not.toHaveBeenCalled();

      sms.verifySmsCode.mockResolvedValue(true);
      await post({ ...enable, twoFactorEnabled: false }).expect(200);
      expect(repo.updateUserTwoFactor).toHaveBeenCalledWith({
        userId: USER_A.id,
        phone: null,
        twoFactorEnabled: false,
      });
    });

    it.each([
      [{ phone: 'abc', code: '123456', twoFactorEnabled: true }],
      [{ phone: '+380501234567', code: '123', twoFactorEnabled: true }],
      [{ phone: '+380501234567', code: '1234567', twoFactorEnabled: true }],
      [{ phone: '+380501234567', code: '123456', twoFactorEnabled: 'yes' }],
      [{ phone: '+380501234567', code: '123456' }],
    ])('invalid body %j -> 400', async (body) => {
      await post(body).expect(400);
    });
  });
});
