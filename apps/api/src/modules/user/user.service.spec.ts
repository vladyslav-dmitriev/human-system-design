/* eslint-disable @typescript-eslint/require-await -- in-memory Redis fakes mimic the async client */
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import bcrypt from 'bcrypt';

import { UserService } from './user.service';
import { ErrorCode } from '../../common/errors';
import { pendingPhoneKey } from '../sender/sms/sms.constants';

// user.service импортирует через baseUrl-алиасы (modules/...), которых нет в конфиге jest
jest.mock('modules/sender/sms', () => ({ SmsService: class {} }), {
  virtual: true,
});
jest.mock('../redis', () => ({
  REDIS_CLIENT: 'REDIS_CLIENT',
  ...jest.requireActual('../redis/session-version'),
}));
jest.mock('../sender/email/email.service', () => ({ EmailService: class {} }));
jest.mock('./user.repository', () => ({ UserRepository: class {} }));

describe('UserService', () => {
  const sms = { verifySmsCode: jest.fn() };
  const email = { sendVerificationEmail: jest.fn() };
  const verification = { createToken: jest.fn() };
  const repo = {
    getUserById: jest.fn(),
    checkUserEmailExist: jest.fn(),
    updateUser: jest.fn(),
    updateUserEmail: jest.fn(),
    updateUserTwoFactor: jest.fn(),
  };
  const store = new Map<string, string>();
  const redis = {
    set: jest.fn(async (k: string, v: string) => {
      store.set(k, v);

      return 'OK';
    }),
    get: jest.fn(async (k: string) => store.get(k) ?? null),
    del: jest.fn(async (k: string) => (store.delete(k) ? 1 : 0)),
    incr: jest.fn(async (k: string) => {
      const next = Number(store.get(k) ?? 0) + 1;

      store.set(k, String(next));

      return next;
    }),
  };

  let service: UserService;
  let oldHash: string;

  const code = async (p: Promise<unknown>) =>
    p.then(
      () => null,
      (e: { status: number; response: { code: string } }) => ({
        status: e.status,
        code: e.response?.code,
      }),
    );

  beforeAll(async () => {
    oldHash = await bcrypt.hash('old-password', 4);
  });

  beforeEach(() => {
    jest.resetAllMocks();
    store.clear();
    redis.set.mockImplementation(async (k: string, v: string) => {
      store.set(k, v);

      return 'OK';
    });
    redis.get.mockImplementation(async (k: string) => store.get(k) ?? null);
    redis.del.mockImplementation(async (k: string) =>
      store.delete(k) ? 1 : 0,
    );
    redis.incr.mockImplementation(async (k: string) => {
      const next = Number(store.get(k) ?? 0) + 1;

      store.set(k, String(next));

      return next;
    });
    verification.createToken.mockReturnValue('signed-token');
    service = new UserService(
      sms as never,
      email as never,
      verification as never,
      repo as never,
      redis as never,
    );
  });

  describe('getUserProfile', () => {
    it('returns the user', async () => {
      repo.getUserById.mockResolvedValue({ id: 'u1' });

      await expect(service.getUserProfile('u1')).resolves.toEqual({ id: 'u1' });
      expect(repo.getUserById).toHaveBeenCalledWith('u1');
    });

    it('throws NotFound for an unknown user', async () => {
      repo.getUserById.mockResolvedValue(null);

      await expect(service.getUserProfile('x')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('updateEmail', () => {
    const dto = { email: '  New@Test.DEV ', currentPassword: 'old-password' };

    beforeEach(() => {
      repo.getUserById.mockResolvedValue({ id: 'u1', password: oldHash });
    });

    it('normalizes (trim + lower case) and saves the new email', async () => {
      repo.checkUserEmailExist.mockResolvedValue(null);

      await expect(service.updateEmail('u1', dto)).resolves.toEqual({
        success: true,
      });

      expect(repo.checkUserEmailExist).toHaveBeenCalledWith(
        'u1',
        'new@test.dev',
      );
      expect(repo.updateUserEmail).toHaveBeenCalledWith('u1', 'new@test.dev');
    });

    it('queues a verification email for the NEW address with the token for it', async () => {
      repo.checkUserEmailExist.mockResolvedValue(null);

      await service.updateEmail('u1', dto, 'uk');

      expect(verification.createToken).toHaveBeenCalledWith(
        'u1',
        'new@test.dev',
      );
      expect(email.sendVerificationEmail).toHaveBeenCalledWith(
        { email: 'new@test.dev', token: 'signed-token' },
        'uk',
      );
    });

    it('a failing mail queue does not fail the already applied email change', async () => {
      repo.checkUserEmailExist.mockResolvedValue(null);
      email.sendVerificationEmail.mockRejectedValue(new Error('queue down'));

      await expect(service.updateEmail('u1', dto)).resolves.toEqual({
        success: true,
      });
    });

    it('revokes sessions: session-version is incremented only after a successful change', async () => {
      repo.checkUserEmailExist.mockResolvedValue(null);

      await service.updateEmail('u1', dto);

      expect(store.get('session-version:u1')).toBe('1');
    });

    it('no session revocation and no email when the change fails', async () => {
      repo.checkUserEmailExist.mockResolvedValue({ id: 'u2' });

      await code(service.updateEmail('u1', dto));

      expect(store.has('session-version:u1')).toBe(false);
      expect(email.sendVerificationEmail).not.toHaveBeenCalled();
    });

    it('wrong current password -> 400 USER_INVALID_PASSWORD, nothing is changed', async () => {
      await expect(
        code(service.updateEmail('u1', { ...dto, currentPassword: 'nope' })),
      ).resolves.toEqual({
        status: 400,
        code: ErrorCode.USER_INVALID_PASSWORD,
      });
      expect(repo.updateUserEmail).not.toHaveBeenCalled();
      expect(repo.checkUserEmailExist).not.toHaveBeenCalled();
    });

    it('taken email -> 409 USER_EMAIL_TAKEN', async () => {
      repo.checkUserEmailExist.mockResolvedValue({ id: 'u2' });

      await expect(code(service.updateEmail('u1', dto))).resolves.toEqual({
        status: 409,
        code: ErrorCode.USER_EMAIL_TAKEN,
      });
      expect(repo.updateUserEmail).not.toHaveBeenCalled();
    });

    it('a unique-constraint race (P2002) also gives 409, not 500', async () => {
      const { Prisma } = jest.requireActual('@prisma/client');

      repo.checkUserEmailExist.mockResolvedValue(null);
      repo.updateUserEmail.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('dup', {
          code: 'P2002',
          clientVersion: 'x',
        }),
      );

      await expect(service.updateEmail('u1', dto)).rejects.toBeInstanceOf(
        ConflictException,
      );
    });

    it('unexpected DB errors are not swallowed', async () => {
      repo.checkUserEmailExist.mockResolvedValue(null);
      repo.updateUserEmail.mockRejectedValue(new Error('db'));

      await expect(service.updateEmail('u1', dto)).rejects.toThrow('db');
    });

    it('always updates the caller own record (id comes from the session)', async () => {
      repo.checkUserEmailExist.mockResolvedValue(null);

      await service.updateEmail('session-user', dto);

      expect(repo.updateUserEmail.mock.calls[0][0]).toBe('session-user');
    });

    it('unknown user -> 404', async () => {
      repo.getUserById.mockResolvedValue(null);

      await expect(service.updateEmail('x', dto)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('updatePassword', () => {
    const dto = {
      currentPassword: 'old-password',
      newPassword: 'new-password',
    };

    it('stores a bcrypt hash of the new password', async () => {
      repo.getUserById.mockResolvedValue({ id: 'u1', password: oldHash });

      await expect(service.updatePassword('u1', dto as never)).resolves.toEqual(
        { success: true },
      );

      const [where, data] = repo.updateUser.mock.calls[0];

      expect(where).toEqual({ id: 'u1' });
      expect(data.password).not.toBe('new-password');
      await expect(bcrypt.compare('new-password', data.password)).resolves.toBe(
        true,
      );
    });

    it('revokes sessions after a password change', async () => {
      repo.getUserById.mockResolvedValue({ id: 'u1', password: oldHash });

      await service.updatePassword('u1', dto);

      expect(store.get('session-version:u1')).toBe('1');
    });

    it('does not revoke sessions when the current password is wrong', async () => {
      repo.getUserById.mockResolvedValue({ id: 'u1', password: oldHash });

      await code(
        service.updatePassword('u1', { ...dto, currentPassword: 'wrong' }),
      );

      expect(store.has('session-version:u1')).toBe(false);
    });

    it('rejects a wrong current password with USER_INVALID_PASSWORD', async () => {
      repo.getUserById.mockResolvedValue({ id: 'u1', password: oldHash });

      await expect(
        code(
          service.updatePassword('u1', { ...dto, currentPassword: 'wrong' }),
        ),
      ).resolves.toEqual({
        status: 400,
        code: ErrorCode.USER_INVALID_PASSWORD,
      });
      expect(repo.updateUser).not.toHaveBeenCalled();
    });

    it('rejects a new password equal to the old one', async () => {
      repo.getUserById.mockResolvedValue({ id: 'u1', password: oldHash });

      await expect(
        service.updatePassword('u1', {
          currentPassword: 'old-password',
          newPassword: 'old-password',
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(repo.updateUser).not.toHaveBeenCalled();
    });

    it('unknown user -> 404 (does not leak a password check)', async () => {
      repo.getUserById.mockResolvedValue(null);

      await expect(
        service.updatePassword('x', dto as never),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('setPendingPhone', () => {
    it('stores the phone for this user only, with a TTL', async () => {
      await service.setPendingPhone('u1', '+380501234567');

      expect(redis.set).toHaveBeenCalledWith(
        pendingPhoneKey('u1'),
        '+380501234567',
        'EX',
        600,
      );
    });
  });

  describe('setTwoFactor', () => {
    const dto = {
      phone: '+380501234567',
      code: '123456',
      twoFactorEnabled: true,
      currentPassword: 'old-password',
    };
    const account = (phone: string, twoFactorEnabled = false) => ({
      id: 'u1',
      password: oldHash,
      profile: { phone },
      authSettings: { twoFactorEnabled },
    });

    beforeEach(() => {
      repo.getUserById.mockResolvedValue(account(''));
      store.set(pendingPhoneKey('u1'), dto.phone);
    });

    it('enables 2FA, stores the phone and clears the pending phone', async () => {
      sms.verifySmsCode.mockResolvedValue(true);

      await expect(service.setTwoFactor('u1', dto)).resolves.toEqual({
        success: true,
      });
      expect(sms.verifySmsCode).toHaveBeenCalledWith({
        phoneNumber: dto.phone,
        code: dto.code,
      });
      expect(repo.updateUserTwoFactor).toHaveBeenCalledWith({
        userId: 'u1',
        phone: dto.phone,
        twoFactorEnabled: true,
      });
      expect(store.has(pendingPhoneKey('u1'))).toBe(false);
    });

    it('enabling and disabling 2FA both revoke sessions', async () => {
      sms.verifySmsCode.mockResolvedValue(true);

      await service.setTwoFactor('u1', dto);
      expect(store.get('session-version:u1')).toBe('1');

      repo.getUserById.mockResolvedValue(account(dto.phone, true));
      await service.setTwoFactor('u1', { ...dto, twoFactorEnabled: false });
      expect(store.get('session-version:u1')).toBe('2');
    });

    it('an invalid code does not revoke sessions', async () => {
      sms.verifySmsCode.mockResolvedValue(false);

      await code(service.setTwoFactor('u1', dto));

      expect(store.has('session-version:u1')).toBe(false);
    });

    it('the code is checked against the pending phone, not a phone supplied in the body', async () => {
      sms.verifySmsCode.mockResolvedValue(true);

      await expect(
        code(service.setTwoFactor('u1', { ...dto, phone: '+380999999999' })),
      ).resolves.toEqual({ status: 400, code: ErrorCode.USER_INVALID_OTP });
      expect(sms.verifySmsCode).not.toHaveBeenCalled();
      expect(repo.updateUserTwoFactor).not.toHaveBeenCalled();
    });

    it('without any pending or saved phone the code is not checked', async () => {
      store.clear();

      await expect(code(service.setTwoFactor('u1', dto))).resolves.toEqual({
        status: 400,
        code: ErrorCode.USER_INVALID_OTP,
      });
      expect(sms.verifySmsCode).not.toHaveBeenCalled();
    });

    it('disabling checks the code against the SAVED phone and clears it', async () => {
      store.clear();
      store.set(pendingPhoneKey('u1'), '+380670000000');
      repo.getUserById.mockResolvedValue(account('+380501234567', true));
      sms.verifySmsCode.mockResolvedValue(true);

      await service.setTwoFactor('u1', { ...dto, twoFactorEnabled: false });

      expect(sms.verifySmsCode).toHaveBeenCalledWith({
        phoneNumber: '+380501234567',
        code: '123456',
      });
      expect(repo.updateUserTwoFactor).toHaveBeenCalledWith({
        userId: 'u1',
        phone: null,
        twoFactorEnabled: false,
      });
      // pending-номер при выключении не используется и сбрасывается
      expect(store.has(pendingPhoneKey('u1'))).toBe(false);
    });

    it.each([true, false])(
      'wrong currentPassword (enabled=%s) -> 400 USER_INVALID_PASSWORD, code is not checked',
      async (twoFactorEnabled) => {
        repo.getUserById.mockResolvedValue(account('+380501234567', true));

        await expect(
          code(
            service.setTwoFactor('u1', {
              ...dto,
              twoFactorEnabled,
              currentPassword: 'wrong',
            }),
          ),
        ).resolves.toEqual({
          status: 400,
          code: ErrorCode.USER_INVALID_PASSWORD,
        });
        expect(sms.verifySmsCode).not.toHaveBeenCalled();
        expect(repo.updateUserTwoFactor).not.toHaveBeenCalled();
        expect(store.has('session-version:u1')).toBe(false);
      },
    );

    it('enabling while 2FA is already enabled -> 400 VALIDATION_FAILED (change number = disable, then enable)', async () => {
      repo.getUserById.mockResolvedValue(account('+380501234567', true));
      sms.verifySmsCode.mockResolvedValue(true);

      await expect(code(service.setTwoFactor('u1', dto))).resolves.toEqual({
        status: 400,
        code: ErrorCode.VALIDATION_FAILED,
      });
      expect(sms.verifySmsCode).not.toHaveBeenCalled();
      expect(repo.updateUserTwoFactor).not.toHaveBeenCalled();
    });

    it('invalid code -> 400 USER_INVALID_OTP and nothing changes', async () => {
      sms.verifySmsCode.mockResolvedValue(false);

      await expect(code(service.setTwoFactor('u1', dto))).resolves.toEqual({
        status: 400,
        code: ErrorCode.USER_INVALID_OTP,
      });
      expect(repo.updateUserTwoFactor).not.toHaveBeenCalled();
      expect(store.has(pendingPhoneKey('u1'))).toBe(true);
    });

    it('fails closed (400) when the SMS provider throws', async () => {
      sms.verifySmsCode.mockRejectedValue(new Error('twilio down'));

      await expect(code(service.setTwoFactor('u1', dto))).resolves.toEqual({
        status: 400,
        code: ErrorCode.USER_INVALID_OTP,
      });
      expect(repo.updateUserTwoFactor).not.toHaveBeenCalled();
    });

    it('does not report success when the DB write fails', async () => {
      sms.verifySmsCode.mockResolvedValue(true);
      repo.updateUserTwoFactor.mockRejectedValue(new Error('db'));

      await expect(service.setTwoFactor('u1', dto)).rejects.toThrow('db');
    });
  });
});
