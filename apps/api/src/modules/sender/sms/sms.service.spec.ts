import { SmsService } from './sms.service';

describe('SmsService', () => {
  const provider = { sendSmsCode: jest.fn(), verifySmsCode: jest.fn() };
  const service = new SmsService(provider);

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
});
