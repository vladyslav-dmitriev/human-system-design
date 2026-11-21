import { BadRequestException, NotFoundException } from '@nestjs/common';

import { EmailsController } from './emails.controller';
import {
  EMAIL_TOKEN_TTL_MS,
  EmailVerificationService,
} from './email-verification.service';
import { ErrorCode } from '../../../common/errors';

jest.mock('interceptors', () => ({ Serialize: () => () => undefined }), {
  virtual: true,
});
jest.mock('./email.service', () => ({ EmailService: class {} }));
jest.mock('../../user/user.repository', () => ({
  UserRepository: class UserRepository {},
}));
jest.mock('../../auth/guards/jwt-auth.guard', () => ({
  AuthGuard: class AuthGuard {},
}));
jest.mock('../../auth/decorators/get-user.decorator', () => ({
  GetUser: () => () => undefined,
}));

describe('EmailsController', () => {
  const service = { sendVerificationEmail: jest.fn() };
  const userRepository = {
    getUserById: jest.fn(),
    markEmailVerified: jest.fn(),
  };
  const verification = new EmailVerificationService({
    get: (k: string) => (k === 'JWT_SECRET' ? 'unit-test-secret' : undefined),
  } as never);
  const controller = new EmailsController(
    service as never,
    verification,
    userRepository as never,
  );

  const user = (overrides: Record<string, unknown> = {}) => ({
    id: 'u1',
    email: 'a@test.dev',
    authSettings: { isVerified: false },
    ...overrides,
  });

  beforeEach(() => {
    service.sendVerificationEmail.mockReset();
    userRepository.getUserById.mockReset();
    userRepository.markEmailVerified.mockReset();
  });

  describe('sendVerificationEmail', () => {
    it.each([
      ['uk-UA,uk;q=0.9', 'uk'],
      ['en-US', 'en'],
      ['de', 'en'],
      [undefined, 'en'],
    ])('accept-language %p -> locale %s', async (header, locale) => {
      userRepository.getUserById.mockResolvedValue(user());

      await expect(
        controller.sendVerificationEmail('u1', header as never),
      ).resolves.toEqual({ success: true });

      expect(service.sendVerificationEmail).toHaveBeenCalledWith(
        { email: 'a@test.dev', token: expect.any(String) },
        locale,
      );
    });

    it('the server issues a token that passes verification for that user', async () => {
      userRepository.getUserById.mockResolvedValue(user());

      await controller.sendVerificationEmail('u1', 'en');

      const { token } = service.sendVerificationEmail.mock.calls[0][0];

      expect(verification.parseUserId(token)?.userId).toBe('u1');
      expect(verification.verifySignature(token, 'a@test.dev')).toBe(true);
    });

    it('does not resend to an already verified user', async () => {
      userRepository.getUserById.mockResolvedValue(
        user({ authSettings: { isVerified: true } }),
      );

      await expect(
        controller.sendVerificationEmail('u1', 'en'),
      ).resolves.toEqual({ success: true });
      expect(service.sendVerificationEmail).not.toHaveBeenCalled();
    });

    it('404 for an unknown user', async () => {
      userRepository.getUserById.mockResolvedValue(null);

      await expect(
        controller.sendVerificationEmail('ghost', 'en'),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('verifyEmail', () => {
    const expectInvalid = async (token: string) => {
      const err = await controller
        .verifyEmail({ token })
        .then(() => null)
        .catch((e: unknown) => e);

      expect(err).toBeInstanceOf(BadRequestException);
      expect((err as BadRequestException).getResponse()).toMatchObject({
        code: ErrorCode.EMAIL_TOKEN_INVALID,
      });
      expect(userRepository.markEmailVerified).not.toHaveBeenCalled();
    };

    it('marks the email verified for a valid token', async () => {
      userRepository.getUserById.mockResolvedValue(user());
      const token = verification.createToken('u1', 'a@test.dev');

      await expect(controller.verifyEmail({ token })).resolves.toEqual({
        success: true,
      });
      expect(userRepository.markEmailVerified).toHaveBeenCalledWith('u1');
    });

    it.each(['definitely-not-a-token', '', 'a.b.c', '....'])(
      'rejects garbage token %p with 400 EMAIL_TOKEN_INVALID',
      async (token) => {
        userRepository.getUserById.mockResolvedValue(user());

        await expectInvalid(token);
      },
    );

    it('rejects a token with a forged signature', async () => {
      userRepository.getUserById.mockResolvedValue(user());
      const [payload] = verification.createToken('u1', 'a@test.dev').split('.');

      await expectInvalid(`${payload}.forged`);
    });

    it('rejects a token whose payload was swapped to another user id', async () => {
      userRepository.getUserById.mockResolvedValue(user({ id: 'victim' }));
      const [, sig] = verification.createToken('u1', 'a@test.dev').split('.');
      const payload = Buffer.from(
        `victim.${Date.now() + EMAIL_TOKEN_TTL_MS}`,
      ).toString('base64url');

      await expectInvalid(`${payload}.${sig}`);
    });

    it('rejects an expired token', async () => {
      userRepository.getUserById.mockResolvedValue(user());
      const token = verification.createToken(
        'u1',
        'a@test.dev',
        Date.now() - EMAIL_TOKEN_TTL_MS - 1000,
      );

      await expectInvalid(token);
    });

    it('a token becomes invalid after the email was changed', async () => {
      const token = verification.createToken('u1', 'a@test.dev');

      userRepository.getUserById.mockResolvedValue(
        user({ email: 'new@test.dev' }),
      );

      await expectInvalid(token);
    });

    it('rejects a token of a deleted user', async () => {
      userRepository.getUserById.mockResolvedValue(null);

      await expectInvalid(verification.createToken('gone', 'a@test.dev'));
    });
  });
});
