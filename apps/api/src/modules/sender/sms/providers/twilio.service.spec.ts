import { TwilioService } from './twilio.service';

const verifications = { create: jest.fn() };
const verificationChecks = { create: jest.fn() };
const servicesFn = jest.fn(() => ({ verifications, verificationChecks }));

jest.mock('twilio', () => ({
  __esModule: true,
  default: jest.fn(() => ({ verify: { v2: { services: servicesFn } } })),
}));

type Env = Record<string, string | undefined>;

const build = (env: Env) =>
  new TwilioService({
    get: (key: string) => env[key],
  } as never);

const base: Env = {
  TWILIO_SID: 'ACtest',
  TWILIO_AUTH_TOKEN: 'token',
  TWILIO_VERIFY_SERVICE_SID: 'VAtest',
};

describe('TwilioService', () => {
  beforeEach(() => {
    verifications.create.mockReset();
    verificationChecks.create.mockReset();
    servicesFn.mockClear();
  });

  it('fails on construction without credentials', () => {
    expect(() => build({})).toThrow('Missing Twilio credentials');
  });

  describe('PAID_API=enabled', () => {
    const env = { ...base, PAID_API: 'enabled' };

    it('sends the code via Verify', async () => {
      verifications.create.mockResolvedValue({});

      await expect(
        build(env).sendSmsCode({ phoneNumber: '+380501234567' }),
      ).resolves.toBe(true);
      expect(servicesFn).toHaveBeenCalledWith('VAtest');
      expect(verifications.create).toHaveBeenCalledWith({
        to: '+380501234567',
        channel: 'sms',
      });
    });

    it('accepts only an "approved" check', async () => {
      verificationChecks.create.mockResolvedValue({ status: 'approved' });
      await expect(
        build(env).verifySmsCode({ phoneNumber: '+1', code: '123456' }),
      ).resolves.toBe(true);

      verificationChecks.create.mockResolvedValue({ status: 'pending' });
      await expect(
        build(env).verifySmsCode({ phoneNumber: '+1', code: '000000' }),
      ).resolves.toBe(false);
    });

    it('propagates provider errors (no silent success)', async () => {
      verificationChecks.create.mockRejectedValue(new Error('429'));

      await expect(
        build(env).verifySmsCode({ phoneNumber: '+1', code: '1' }),
      ).rejects.toThrow('429');
    });

    it('throws when the Verify service sid is not configured', async () => {
      const service = build({ ...env, TWILIO_VERIFY_SERVICE_SID: undefined });

      await expect(
        service.verifySmsCode({ phoneNumber: '+1', code: '1' }),
      ).rejects.toThrow('Twilio Verify is not configured');
    });
  });

  describe('PAID_API is not "enabled"', () => {
    it.each([undefined, 'disabled', 'ENABLED', ''])(
      'does not call Twilio when PAID_API=%p',
      async (paid) => {
        const service = build({ ...base, PAID_API: paid });

        await service.sendSmsCode({ phoneNumber: '+1' });
        await service.verifySmsCode({ phoneNumber: '+1', code: '1' });

        expect(verifications.create).not.toHaveBeenCalled();
        expect(verificationChecks.create).not.toHaveBeenCalled();
      },
    );

    // BUG: см. FIX.md «Без PAID_API=enabled любой SMS-код считается верным»
    it.failing(
      'does not accept an arbitrary code when PAID_API is unset',
      async () => {
        const service = build({ ...base, PAID_API: undefined });

        await expect(
          service.verifySmsCode({ phoneNumber: '+1', code: 'anything' }),
        ).resolves.toBe(false);
      },
    );

    // BUG: см. FIX.md «Без PAID_API=enabled любой SMS-код считается верным»
    it.failing('does not accept an arbitrary code in production', async () => {
      const prev = process.env.NODE_ENV;

      process.env.NODE_ENV = 'production';
      try {
        const service = build({ ...base, PAID_API: 'disabled' });

        await expect(
          service.verifySmsCode({ phoneNumber: '+1', code: '000000' }),
        ).resolves.toBe(false);
      } finally {
        process.env.NODE_ENV = prev;
      }
    });
  });
});
