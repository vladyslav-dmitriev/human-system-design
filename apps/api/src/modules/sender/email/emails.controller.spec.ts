import { BadRequestException } from '@nestjs/common';

import { EmailsController } from './emails.controller';

jest.mock('./email.service', () => ({ EmailService: class {} }));

describe('EmailsController', () => {
  const service = { sendVerificationEmail: jest.fn() };
  const controller = new EmailsController(service as never);

  beforeEach(() => service.sendVerificationEmail.mockReset());

  describe('sendVerificationEmail', () => {
    it.each([
      ['uk-UA,uk;q=0.9', 'uk'],
      ['en-US', 'en'],
      ['de', 'en'],
      [undefined, 'en'],
    ])('accept-language %p -> locale %s', async (header, locale) => {
      const body = { email: 'a@test.dev', token: 't' };

      await controller.sendVerificationEmail(body, header);

      expect(service.sendVerificationEmail).toHaveBeenCalledWith(body, locale);
    });
  });

  describe('verifyEmail', () => {
    // BUG: см. FIX.md «verify-email подтверждает почту без проверки токена»
    it.failing('rejects an unknown or expired token with 400', () => {
      expect(() => controller.verifyEmail('definitely-not-a-token')).toThrow(
        BadRequestException,
      );
    });

    // BUG: см. FIX.md «verify-email подтверждает почту без проверки токена»
    it.failing('rejects a missing token with 400', () => {
      expect(() => controller.verifyEmail(undefined as never)).toThrow(
        BadRequestException,
      );
    });
  });
});
