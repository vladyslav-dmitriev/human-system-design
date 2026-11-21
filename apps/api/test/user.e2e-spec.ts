/* eslint-disable @typescript-eslint/require-await */
import bcrypt from 'bcrypt';
import request from 'supertest';
import type { INestApplication } from '@nestjs/common';

import { UsersController } from '../src/modules/user/users.controller';
import { UserService } from '../src/modules/user/user.service';
import { UserRepository } from '../src/modules/user/user.repository';
import { SmsService } from '../src/modules/sender/sms/sms.service';
import { RabbitMQService } from '../src/modules/rabbitmq/rabbitmq.service';
import { createTestApp, sessionCookie, USER_A, USER_B } from './helpers/app';

const OLD_PASSWORD = 'Old-Passw0rd-qa';

describe('UsersController (nest testing module, mocks)', () => {
  let app: INestApplication;
  let cookieA: string;
  let passwordHash: string;
  const repo = {
    getUserById: jest.fn(),
    checkUserEmailExist: jest.fn(),
    updateUser: jest.fn(),
    updateUserTwoFactor: jest.fn(),
  };
  const sms = { verifySmsCode: jest.fn() };
  const producer = { sendEmailUserCreate: jest.fn() };

  beforeAll(async () => {
    cookieA = await sessionCookie(USER_A);
    passwordHash = await bcrypt.hash(OLD_PASSWORD, 4);
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  beforeEach(async () => {
    Object.values(repo).forEach((m) => m.mockReset());
    sms.verifySmsCode.mockReset();
    producer.sendEmailUserCreate.mockReset().mockResolvedValue(undefined);
    repo.getUserById.mockImplementation(async (id: string) => ({
      id,
      email: `${id}@example.test`,
      password: passwordHash,
      role: 'USER',
      profile: { name: 'QA', phone: '+380501234567' },
      authSettings: {
        isVerified: false,
        verifiedToken: 'secret-verify-token',
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
        {
          provide: RabbitMQService,
          useValue: { getEmailProducer: () => producer },
        },
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

    // BUG: новый, см. отчёт L2 (UserGetProfileResponseDto отдаёт authSettings.verifiedToken)
    it.failing('does not leak the email verification token', async () => {
      const res = await http()
        .get('/user/profile')
        .set('Cookie', cookieA)
        .expect(200);
      expect(JSON.stringify(res.body)).not.toContain('secret-verify-token');
    });

    // BUG: см. FIX.md «getUserProfile отправляет тестовое письмо на каждый запрос профиля»
    it.failing(
      'does not publish a RabbitMQ message on a plain profile read',
      async () => {
        await http().get('/user/profile').set('Cookie', cookieA).expect(200);
        expect(producer.sendEmailUserCreate).not.toHaveBeenCalled();
      },
    );
  });

  describe('PATCH /user/profile (change email)', () => {
    it('happy path normalizes email (trim + lowercase)', async () => {
      repo.checkUserEmailExist.mockResolvedValue(null);
      const res = await http()
        .patch('/user/profile')
        .set('Cookie', cookieA)
        .send({ email: 'New.Mail@Example.test' })
        .expect(200);
      expect(res.status).toBe(200);
      expect(repo.updateUser).toHaveBeenCalledWith(
        { id: USER_A.id },
        { email: 'new.mail@example.test' },
      );
    });

    // BUG: новый, см. отчёт L2 (ResponseDto с @IsBoolean вместо @Expose: {success:true} превращается в {})
    it.failing(
      'responds with {success:true} as declared by the DTO',
      async () => {
        repo.checkUserEmailExist.mockResolvedValue(null);
        const res = await http()
          .patch('/user/profile')
          .set('Cookie', cookieA)
          .send({ email: 'x@example.test' })
          .expect(200);
        expect(res.body).toEqual({ success: true });
      },
    );

    it('email already used by another user -> 409 and no update', async () => {
      repo.checkUserEmailExist.mockResolvedValue({ id: USER_B.id });
      await http()
        .patch('/user/profile')
        .set('Cookie', cookieA)
        .send({ email: USER_B.email })
        .expect(409);
      expect(repo.updateUser).not.toHaveBeenCalled();
    });

    it.each([
      [{}],
      [{ email: '' }],
      [{ email: 'nope' }],
      [{ email: 5 }],
      [{ email: 'a@example.test', id: 'user-b' }],
    ])('invalid body %j -> 400', async (body) => {
      const res = await http()
        .patch('/user/profile')
        .set('Cookie', cookieA)
        .send(body)
        .expect(400);
      expect(res.body.statusCode).toBe(400);
      expect(res.body.message.length).toBeGreaterThan(0);
    });

    it('cannot target another user via body id (whitelist)', async () => {
      const res = await http()
        .patch('/user/profile')
        .set('Cookie', cookieA)
        .send({ email: 'a@example.test', id: USER_B.id })
        .expect(400);
      expect(res.body.message).toContain('property id should not exist');
      expect(repo.updateUser).not.toHaveBeenCalled();
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

    it('wrong current password -> 400, nothing saved', async () => {
      await patch({
        currentPassword: 'wrong',
        newPassword: 'New-Passw0rd-qa',
      }).expect(400);
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

    it('non-string newPassword (number) -> 400', async () => {
      await patch({
        currentPassword: OLD_PASSWORD,
        newPassword: 123456789,
      }).expect(400);
    });
  });

  describe('POST /user/profile/2fa', () => {
    const post = (body: Record<string, unknown>) =>
      http().post('/user/profile/2fa').set('Cookie', cookieA).send(body);

    it('valid code enables 2FA for the caller only', async () => {
      sms.verifySmsCode.mockResolvedValue(true);
      await post({
        phone: '+380501234567',
        code: '123456',
        twoFactorEnabled: true,
      }).expect(201);
      expect(repo.updateUserTwoFactor).toHaveBeenCalledWith({
        userId: USER_A.id,
        phone: '+380501234567',
        twoFactorEnabled: true,
      });
    });

    it('wrong code does not change settings', async () => {
      sms.verifySmsCode.mockResolvedValue(false);
      await post({
        phone: '+380501234567',
        code: '000000',
        twoFactorEnabled: true,
      });
      expect(repo.updateUserTwoFactor).not.toHaveBeenCalled();
    });

    it.each([
      [{ phone: 'abc', code: '123456', twoFactorEnabled: true }],
      [{ phone: '+380501234567', code: '123', twoFactorEnabled: true }],
      [{ phone: '+380501234567', code: '123456', twoFactorEnabled: 'yes' }],
      [{ phone: '+380501234567', code: '123456' }],
    ])('invalid body %j -> 400', async (body) => {
      await post(body).expect(400);
    });

    // BUG: новый, см. отчёт L2 (неверный OTP -> 201 с пустым телом, web показывает «2FA включена»)
    it.failing(
      'wrong code -> 400 so that the client can show an error',
      async () => {
        sms.verifySmsCode.mockResolvedValue(false);
        await post({
          phone: '+380501234567',
          code: '000000',
          twoFactorEnabled: true,
        }).expect(400);
      },
    );
  });
});
