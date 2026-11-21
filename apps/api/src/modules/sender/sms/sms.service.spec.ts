/* eslint-disable @typescript-eslint/require-await -- in-memory Redis fakes mimic the async client */
import { SmsService } from './sms.service';
import { ErrorCode } from '../../../common/errors';
import { pendingPhoneKey, SMS_SEND_LIMIT } from './sms.constants';

jest.mock('../../user/user.repository', () => ({
  UserRepository: class UserRepository {},
}));

describe('SmsService', () => {
  const provider = { sendSmsCode: jest.fn(), verifySmsCode: jest.fn() };
  const userRepository = { getUserById: jest.fn() };
  const store = new Map<string, string>();
  const redis = {
    incr: jest.fn(async (k: string) => {
      const n = Number(store.get(k) ?? 0) + 1;

      store.set(k, String(n));

      return n;
    }),
    expire: jest.fn(),
    get: jest.fn(async (k: string) => store.get(k) ?? null),
  };
  const service = new SmsService(
    provider,
    userRepository as never,
    redis as never,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    store.clear();
  });

  it('delegates sendSmsCode to the provider with only the phone number', async () => {
    provider.sendSmsCode.mockResolvedValue(true);

    await expect(
      service.sendSmsCode({ phoneNumber: '+1', extra: 'x' } as never),
    ).resolves.toBe(true);
    expect(provider.sendSmsCode).toHaveBeenCalledWith({ phoneNumber: '+1' });
  });

  it('delegates verifySmsCode and returns the provider verdict', async () => {
    provider.verifySmsCode.mockResolvedValue(false);

    await expect(
      service.verifySmsCode({ phoneNumber: '+1', code: '123456' }),
    ).resolves.toBe(false);
    expect(provider.verifySmsCode).toHaveBeenCalledWith({
      phoneNumber: '+1',
      code: '123456',
    });
  });

  describe('sendCodeToUser', () => {
    it('sends to the phone stored in the profile (the number never comes from the client)', async () => {
      userRepository.getUserById.mockResolvedValue({
        profile: { phone: '+380501234567' },
      });

      await service.sendCodeToUser('u1');

      expect(provider.sendSmsCode).toHaveBeenCalledWith({
        phoneNumber: '+380501234567',
      });
    });

    it('prefers the pending (not yet confirmed) phone', async () => {
      store.set(pendingPhoneKey('u1'), '+380670000000');

      await service.sendCodeToUser('u1');

      expect(provider.sendSmsCode).toHaveBeenCalledWith({
        phoneNumber: '+380670000000',
      });
      expect(userRepository.getUserById).not.toHaveBeenCalled();
    });

    it('400 when there is no phone at all', async () => {
      userRepository.getUserById.mockResolvedValue({ profile: { phone: '' } });

      await expect(service.sendCodeToUser('u1')).rejects.toMatchObject({
        status: 400,
      });
      expect(provider.sendSmsCode).not.toHaveBeenCalled();
    });

    it(`rate-limits per user: request ${SMS_SEND_LIMIT + 1} gives 429 RATE_LIMITED and sends nothing`, async () => {
      userRepository.getUserById.mockResolvedValue({
        profile: { phone: '+380501234567' },
      });

      for (let i = 0; i < SMS_SEND_LIMIT; i++) {
        await service.sendCodeToUser('u1');
      }
      expect(provider.sendSmsCode).toHaveBeenCalledTimes(SMS_SEND_LIMIT);

      await expect(service.sendCodeToUser('u1')).rejects.toMatchObject({
        status: 429,
        response: { code: ErrorCode.RATE_LIMITED },
      });
      expect(provider.sendSmsCode).toHaveBeenCalledTimes(SMS_SEND_LIMIT);

      // другой пользователь не затронут
      await service.sendCodeToUser('u2');
      expect(provider.sendSmsCode).toHaveBeenCalledTimes(SMS_SEND_LIMIT + 1);
    });
  });
});
