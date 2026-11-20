/* eslint-disable @typescript-eslint/require-await */
import request from 'supertest';
import type { INestApplication } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';

import { EmailsController } from '../src/modules/sender/email/emails.controller';
import { EmailService } from '../src/modules/sender/email/email.service';
import { SmsController } from '../src/modules/sender/sms/sms.controller';
import { SmsService } from '../src/modules/sender/sms/sms.service';
import { CaptchaGuard } from '../src/modules/captcha/guards/captcha.guard';
import { CaptchaService } from '../src/modules/captcha/captcha.service';
import { createTestApp } from './helpers/app';

const GOOD = 'captcha-ok';

describe('Sender controllers (nest testing module, mocks)', () => {
  let app: INestApplication;
  const email = { sendVerificationEmail: jest.fn() };
  const sms = { sendSmsCode: jest.fn() };

  beforeEach(async () => {
    email.sendVerificationEmail.mockReset().mockResolvedValue(undefined);
    sms.sendSmsCode.mockReset().mockResolvedValue(true);
    app = await createTestApp({
      imports: [
        ThrottlerModule.forRoot({ throttlers: [{ limit: 10, ttl: 60000 }] }),
      ],
      controllers: [EmailsController, SmsController],
      providers: [
        CaptchaGuard,
        { provide: APP_GUARD, useClass: ThrottlerGuard },
        { provide: EmailService, useValue: email },
        { provide: SmsService, useValue: sms },
        {
          provide: CaptchaService,
          useValue: { verify: jest.fn(async (t: string) => t === GOOD) },
        },
      ],
    });
  });

  afterEach(() => app.close());

  const http = () => request(app.getHttpServer());

  describe('POST /sender/emails/send-verification', () => {
    it('valid body -> 201 and mail queued, locale from Accept-Language', async () => {
      await http()
        .post('/sender/emails/send-verification')
        .set('Accept-Language', 'uk-UA')
        .send({ email: 'qa@example.test', token: 'tok' })
        .expect(201);
      expect(email.sendVerificationEmail).toHaveBeenCalledWith(
        { email: 'qa@example.test', token: 'tok' },
        'uk',
      );
    });

    it.each([
      [{}],
      [{ email: 'qa@example.test' }],
      [{ email: 'bad', token: 't' }],
      [{ email: 'qa@example.test', token: 1 }],
      [{ email: 'qa@example.test', token: 't', x: 1 }],
    ])('invalid body %j -> 400', async (body) => {
      const res = await http()
        .post('/sender/emails/send-verification')
        .send(body)
        .expect(400);
      expect(res.body.statusCode).toBe(400);
    });

    // BUG: новый, см. отчёт L2 (эндпоинт публичный: ни сессии, ни капчи; можно слать письма на любой адрес с произвольным token)
    it.failing('requires a session or a captcha (not anonymous)', async () => {
      const res = await http()
        .post('/sender/emails/send-verification')
        .send({ email: 'victim@example.test', token: 'anything' });
      expect([401, 403]).toContain(res.status);
    });
  });

  describe('GET /sender/emails/verify-email', () => {
    // BUG: см. FIX.md «verify-email подтверждает почту без проверки токена»
    it.failing('unknown token -> 400', async () => {
      await http()
        .get('/sender/emails/verify-email?token=definitely-not-a-real-token')
        .expect(400);
    });

    // BUG: см. FIX.md «verify-email подтверждает почту без проверки токена»
    it.failing('missing token -> 400', async () => {
      await http().get('/sender/emails/verify-email').expect(400);
    });
  });

  describe('POST /sender/sms/send', () => {
    const send = (body: Record<string, unknown>) =>
      http().post('/sender/sms/send').send(body);

    it('without captcha -> 403', async () => {
      await send({ phoneNumber: '+380501234567' }).expect(403);
      expect(sms.sendSmsCode).not.toHaveBeenCalled();
    });

    it('happy path -> 201 {success:true}', async () => {
      const res = await send({
        phoneNumber: '+380501234567',
        captchaToken: GOOD,
      }).expect(201);
      expect(res.body).toEqual({ success: true });
    });

    it.each([['abc'], ['123'], [''], ['+0000']])(
      'invalid phone %j -> 400',
      async (phoneNumber) => {
        await send({ phoneNumber, captchaToken: GOOD }).expect(400);
      },
    );

    it('rate limit: 4th request in a minute -> 429', async () => {
      for (let i = 0; i < 3; i++)
        await send({ phoneNumber: '+380501234567', captchaToken: GOOD }).expect(
          201,
        );
      await send({ phoneNumber: '+380501234567', captchaToken: GOOD }).expect(
        429,
      );
    });
  });
});
