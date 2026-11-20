import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import bcrypt from 'bcrypt';

import { UserService } from './user.service';

// user.service импортирует через baseUrl-алиасы (modules/...), которых нет в конфиге jest
jest.mock('modules/sender/sms', () => ({ SmsService: class {} }), {
  virtual: true,
});
jest.mock(
  'modules/rabbitmq/rabbitmq.service',
  () => ({ RabbitMQService: class {} }),
  { virtual: true },
);
jest.mock('./user.repository', () => ({ UserRepository: class {} }));

describe('UserService', () => {
  const emailProducer = { sendEmailUserCreate: jest.fn() };
  const rabbit = { getEmailProducer: jest.fn(() => emailProducer) };
  const sms = { verifySmsCode: jest.fn() };
  const repo = {
    getUserById: jest.fn(),
    checkUserEmailExist: jest.fn(),
    updateUser: jest.fn(),
    updateUserTwoFactor: jest.fn(),
  };

  let service: UserService;
  let oldHash: string;

  beforeAll(async () => {
    oldHash = await bcrypt.hash('old-password', 4);
  });

  beforeEach(() => {
    jest.resetAllMocks();
    rabbit.getEmailProducer.mockReturnValue(emailProducer);
    service = new UserService(rabbit as never, sms as never, repo as never);
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

    // BUG: см. FIX.md «getUserProfile отправляет тестовое письмо на каждый запрос профиля»
    it.failing('does not publish anything to RabbitMQ', async () => {
      repo.getUserById.mockResolvedValue({ id: 'u1' });

      await service.getUserProfile('u1');

      expect(emailProducer.sendEmailUserCreate).not.toHaveBeenCalled();
    });
  });

  describe('updateEmail', () => {
    it('normalizes (trim + lower case) and saves the new email', async () => {
      repo.checkUserEmailExist.mockResolvedValue(null);

      await expect(
        service.updateEmail('u1', { email: '  New@Test.DEV ' }),
      ).resolves.toEqual({ success: true });

      expect(repo.checkUserEmailExist).toHaveBeenCalledWith(
        'u1',
        'new@test.dev',
      );
      expect(repo.updateUser).toHaveBeenCalledWith(
        { id: 'u1' },
        { email: 'new@test.dev' },
      );
    });

    it('throws Conflict and does not update when the email is taken', async () => {
      repo.checkUserEmailExist.mockResolvedValue({ id: 'u2' });

      await expect(
        service.updateEmail('u1', { email: 'taken@test.dev' }),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(repo.updateUser).not.toHaveBeenCalled();
    });

    it('always updates the caller own record (id comes from the session)', async () => {
      repo.checkUserEmailExist.mockResolvedValue(null);

      await service.updateEmail('session-user', { email: 'a@b.dev' });

      expect(repo.updateUser.mock.calls[0][0]).toEqual({ id: 'session-user' });
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

    it('rejects a wrong current password', async () => {
      repo.getUserById.mockResolvedValue({ id: 'u1', password: oldHash });

      await expect(
        service.updatePassword('u1', {
          ...dto,
          currentPassword: 'wrong',
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
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

    it('rejects an unknown user', async () => {
      repo.getUserById.mockResolvedValue(null);

      await expect(
        service.updatePassword('x', dto as never),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('setTwoFactor', () => {
    const dto = {
      phone: '+380501234567',
      code: '123456',
      twoFactorEnabled: true,
    };

    it('enables 2FA and stores the phone when the code is valid', async () => {
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
    });

    it('clears the phone when 2FA is being disabled', async () => {
      sms.verifySmsCode.mockResolvedValue(true);

      await service.setTwoFactor('u1', { ...dto, twoFactorEnabled: false });

      expect(repo.updateUserTwoFactor).toHaveBeenCalledWith({
        userId: 'u1',
        phone: null,
        twoFactorEnabled: false,
      });
    });

    it('does not change settings with an invalid code', async () => {
      sms.verifySmsCode.mockResolvedValue(false);

      await expect(service.setTwoFactor('u1', dto)).resolves.toEqual({
        success: false,
      });
      expect(repo.updateUserTwoFactor).not.toHaveBeenCalled();
    });

    it('does not change settings when the SMS provider fails', async () => {
      sms.verifySmsCode.mockRejectedValue(new Error('twilio down'));

      await expect(service.setTwoFactor('u1', dto)).resolves.toEqual({
        success: false,
      });
      expect(repo.updateUserTwoFactor).not.toHaveBeenCalled();
    });

    // BUG: см. FIX.md «setTwoFactor глотает ошибки и отвечает 200»
    it.failing(
      'reports an invalid code as 400 (BadRequestException)',
      async () => {
        sms.verifySmsCode.mockResolvedValue(false);

        await expect(service.setTwoFactor('u1', dto)).rejects.toBeInstanceOf(
          BadRequestException,
        );
      },
    );

    // BUG: см. FIX.md «setTwoFactor глотает ошибки и отвечает 200»
    it.failing('does not report success when the DB write fails', async () => {
      sms.verifySmsCode.mockResolvedValue(true);
      repo.updateUserTwoFactor.mockRejectedValue(new Error('db'));

      await expect(service.setTwoFactor('u1', dto)).rejects.toThrow('db');
    });
  });
});
