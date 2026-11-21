/* eslint-disable @typescript-eslint/require-await */
import request from 'supertest';
import type { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';

import { EmailsController } from '../src/modules/sender/email/emails.controller';
import { EmailService } from '../src/modules/sender/email/email.service';
import { EmailVerificationService } from '../src/modules/sender/email/email-verification.service';
import { SmsController } from '../src/modules/sender/sms/sms.controller';
import { SmsService } from '../src/modules/sender/sms/sms.service';
import { UserRepository } from '../src/modules/user/user.repository';
import { REDIS_CLIENT } from '../src/modules/redis';
import { AuthGuard } from '../src/modules/auth/guards/jwt-auth.guard';
import { createTestApp, sessionCookie, USER_A, USER_B } from './helpers/app';
import { createFakeRedis } from './helpers/fake-redis';

type DbUser = {
  id: string;
  email: string;
  password: string;
  authSettings: { isVerified: boolean };
  profile: { phone: string };
};

describe('Sender controllers (nest testing module, mocks)', () => {
  let app: INestApplication;
  let cookieA: string;
  let cookieB: string;
  let users: Map<string, DbUser>;
  let verification: EmailVerificationService;
  let redis: ReturnType<typeof createFakeRedis>;
  const email = { sendVerificationEmail: jest.fn() };
  const smsProvider = { sendSmsCode: jest.fn(), verifySmsCode: jest.fn() };
  const markEmailVerified = jest.fn();

  beforeAll(async () => {
    cookieA = await sessionCookie(USER_A);
    cookieB = await sessionCookie(USER_B);
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  beforeEach(async () => {
    redis = createFakeRedis();
    users = new Map([
      [
        USER_A.id,
        {
          id: USER_A.id,
          email: USER_A.email,
          password: 'hash',
          authSettings: { isVerified: false },
          profile: { phone: '+380501234567' },
        },
      ],
      [
        USER_B.id,
        {
          id: USER_B.id,
          email: USER_B.email,
          password: 'hash',
          authSettings: { isVerified: true },
          profile: { phone: '' },
        },
      ],
    ]);
    email.sendVerificationEmail.mockReset().mockResolvedValue(undefined);
    smsProvider.sendSmsCode.mockReset().mockResolvedValue(true);
    markEmailVerified.mockReset().mockResolvedValue(undefined);

    const userRepo = {
      getUserById: jest.fn(async (id: string) => users.get(id) ?? null),
      markEmailVerified,
    };

    app = await createTestApp({
      imports: [
        ThrottlerModule.forRoot({ throttlers: [{ limit: 10, ttl: 60000 }] }),
      ],
      controllers: [EmailsController, SmsController],
      providers: [
        AuthGuard,
        EmailVerificationService,
        SmsService,
        { provide: 'SMS_PROVIDER', useValue: smsProvider },
        { provide: REDIS_CLIENT, useValue: redis },
        { provide: ConfigService, useValue: { get: () => 'e2e-secret' } },
        { provide: APP_GUARD, useClass: ThrottlerGuard },
        { provide: EmailService, useValue: email },
        { provide: UserRepository, useValue: userRepo },
      ],
    });
    verification = app.get(EmailVerificationService);
  });

  afterEach(() => app.close());

  const http = () => request(app.getHttpServer());

  describe('POST /sender/emails/send-verification', () => {
    const send = (cookie?: string) => {
      const req = http().post('/sender/emails/send-verification');

      return cookie ? req.set('Cookie', cookie) : req;
    };

    it('anonymous -> 401, nothing is sent', async () => {
      await send().send({ email: 'victim@example.test' }).expect(401);
      expect(email.sendVerificationEmail).not.toHaveBeenCalled();
    });

    it('session user -> 200 {success:true}; the SERVER makes the token, locale from Accept-Language', async () => {
      const res = await send(cookieA)
        .set('Accept-Language', 'uk-UA')
        .expect(200);
      expect(res.body).toEqual({ success: true });
      expect(email.sendVerificationEmail).toHaveBeenCalledTimes(1);

      const [payload, locale] = email.sendVerificationEmail.mock.calls[0];

      expect(locale).toBe('uk');
      expect(payload.email).toBe(USER_A.email);
      expect(verification.verifySignature(payload.token, USER_A.email)).toBe(
        true,
      );
      expect(verification.parseUserId(payload.token)?.userId).toBe(USER_A.id);
    });

    it('a body with someone else email / own token cannot redirect the mail (spam / phishing vector)', async () => {
      await send(cookieA)
        .send({ email: 'victim@example.test', token: 'attacker-token' })
        .expect(200);

      const [payload] = email.sendVerificationEmail.mock.calls[0];

      expect(payload.email).toBe(USER_A.email);
      expect(payload.token).not.toBe('attacker-token');
    });

    it('an already verified user: success, but no mail', async () => {
      const res = await send(cookieB).expect(200);
      expect(res.body).toEqual({ success: true });
      expect(email.sendVerificationEmail).not.toHaveBeenCalled();
    });

    it('rate limit: 4th request in a minute -> 429', async () => {
      for (let i = 0; i < 3; i++) await send(cookieA).expect(200);
      const res = await send(cookieA).expect(429);
      expect(res.body.code).toBe('RATE_LIMITED');
    });
  });

  describe('GET /sender/emails/verify-email', () => {
    const verify = (token?: string) =>
      http()
        .get('/sender/emails/verify-email')
        .query(token ? { token } : {});

    it('valid token -> 200 and the email is marked verified', async () => {
      const token = verification.createToken(USER_A.id, USER_A.email);

      await verify(token).expect(200);
      expect(markEmailVerified).toHaveBeenCalledWith(USER_A.id);
    });

    it('missing token -> 400', async () => {
      await verify().expect(400);
      expect(markEmailVerified).not.toHaveBeenCalled();
    });

    it('unknown token -> 400 EMAIL_TOKEN_INVALID', async () => {
      const res = await verify('definitely-not-a-real-token').expect(400);
      expect(res.body.code).toBe('EMAIL_TOKEN_INVALID');
      expect(markEmailVerified).not.toHaveBeenCalled();
    });

    it('forged signature -> 400', async () => {
      const [payload] = verification
        .createToken(USER_A.id, USER_A.email)
        .split('.');

      await verify(`${payload}.AAAA`).expect(400);
      expect(markEmailVerified).not.toHaveBeenCalled();
    });

    it('token for the old email stops working after the email change', async () => {
      const token = verification.createToken(USER_A.id, USER_A.email);

      Object.assign(users.get(USER_A.id) ?? {}, {
        email: 'changed@example.test',
      });
      await verify(token).expect(400);
      expect(markEmailVerified).not.toHaveBeenCalled();
    });

    it('an expired token -> 400', async () => {
      const token = verification.createToken(
        USER_A.id,
        USER_A.email,
        Date.now() - 25 * 60 * 60 * 1000,
      );

      await verify(token).expect(400);
    });
  });

  describe('POST /sender/sms/send', () => {
    const send = (cookie?: string) => {
      const req = http().post('/sender/sms/send');

      return cookie ? req.set('Cookie', cookie) : req;
    };

    it('anonymous -> 401, no SMS (SMS pumping is closed)', async () => {
      await send().expect(401);
      expect(smsProvider.sendSmsCode).not.toHaveBeenCalled();
    });

    it('session user -> 200 {success:true}; SMS goes to the phone stored in the profile', async () => {
      const res = await send(cookieA).expect(200);
      expect(res.body).toEqual({ success: true });
      expect(smsProvider.sendSmsCode).toHaveBeenCalledWith({
        phoneNumber: '+380501234567',
      });
    });

    it('a phone number in the body is ignored: the client cannot choose the recipient', async () => {
      await send(cookieA)
        .send({ phoneNumber: '+19995550100', phone: '+19995550100' })
        .expect(200);
      expect(smsProvider.sendSmsCode).toHaveBeenCalledTimes(1);
      expect(smsProvider.sendSmsCode).toHaveBeenCalledWith({
        phoneNumber: '+380501234567',
      });
    });

    it('a pending phone (2FA enrolment) is preferred over the profile phone', async () => {
      redis.store.set(`pending-phone:${USER_A.id}`, '+380670000000');
      await send(cookieA).expect(200);
      expect(smsProvider.sendSmsCode).toHaveBeenCalledWith({
        phoneNumber: '+380670000000',
      });
    });

    it('user without any phone -> 400, nothing sent', async () => {
      await send(cookieB).expect(400);
      expect(smsProvider.sendSmsCode).not.toHaveBeenCalled();
    });

    it('rate limit: 4th request in a minute -> 429 and no 4th SMS', async () => {
      for (let i = 0; i < 3; i++) await send(cookieA).expect(200);
      const res = await send(cookieA).expect(429);
      expect(res.body.code).toBe('RATE_LIMITED');
      expect(smsProvider.sendSmsCode).toHaveBeenCalledTimes(3);
    });
  });
});
