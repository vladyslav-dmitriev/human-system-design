/* eslint-disable @typescript-eslint/require-await -- in-memory Redis fakes mimic the async client */
import bcrypt from 'bcrypt';
import { createHash } from 'crypto';

import { AuthService, LOGIN_OTP_MAX_ATTEMPTS } from './auth.service';
import { ErrorCode } from '../../common/errors';

jest.mock('../sender/email', () => ({ EmailService: class EmailService {} }));
jest.mock('../sender/email/email-verification.service', () => ({
  EmailVerificationService: class EmailVerificationService {},
}));
jest.mock('../sender/sms', () => ({ SmsService: class SmsService {} }));
jest.mock('../user', () => ({ UserRepository: class UserRepository {} }));
jest.mock('../redis', () => ({
  REDIS_CLIENT: 'REDIS_CLIENT',
  ...jest.requireActual('../redis/session-version'),
}));
jest.mock('./auth.repository', () => ({
  AuthRepository: class AuthRepository {},
}));

const sha256 = (v: string) => createHash('sha256').update(v).digest('hex');

/** Минимальный in-memory Redis: set/get/getdel/incr/del (TTL запоминается, но не истекает). */
function createFakeRedis() {
  const store = new Map<string, string>();
  const ttl = new Map<string, number>();

  return {
    store,
    ttl,
    set: jest.fn(async (k: string, v: string, _ex?: string, sec?: number) => {
      store.set(k, v);
      if (sec) ttl.set(k, sec);

      return 'OK';
    }),
    get: jest.fn(async (k: string) => store.get(k) ?? null),
    getdel: jest.fn(async (k: string) => {
      const v = store.get(k) ?? null;

      store.delete(k);

      return v;
    }),
    incr: jest.fn(async (k: string) => {
      const next = Number(store.get(k) ?? 0) + 1;

      store.set(k, String(next));

      return next;
    }),
    del: jest.fn(async (k: string) => (store.delete(k) ? 1 : 0)),
  };
}

describe('AuthService', () => {
  const authRepository = {
    getUserCredentials: jest.fn(),
    getUserLogin: jest.fn(),
    getUserLoginById: jest.fn(),
  };
  const userRepository = {
    checkUserEmailExist: jest.fn(),
    createUser: jest.fn(),
  };
  const emailService = { sendVerificationEmail: jest.fn() };
  const emailVerification = { createToken: jest.fn() };
  const smsService = { sendSmsCode: jest.fn(), verifySmsCode: jest.fn() };

  let redis: ReturnType<typeof createFakeRedis>;
  let service: AuthService;
  let passwordHash: string;

  beforeAll(async () => {
    passwordHash = await bcrypt.hash('correct-password', 4);
  });

  beforeEach(() => {
    jest.resetAllMocks();
    redis = createFakeRedis();
    emailVerification.createToken.mockReturnValue('signed-token');
    service = new AuthService(
      authRepository as never,
      userRepository as never,
      emailService as never,
      emailVerification as never,
      smsService as never,
      redis as never,
    );
  });

  const creds = { email: 'a@test.dev', password: 'correct-password' };

  const loginUser = (overrides: Record<string, unknown> = {}) => ({
    id: 'u1',
    email: 'a@test.dev',
    role: 'USER',
    authSettings: { twoFactorEnabled: false },
    profile: { name: 'Ann', phone: '+380501234567' },
    ...overrides,
  });

  const ticketKey = (ticket: string) => `login-ticket:${sha256(ticket)}`;

  describe('createAccount', () => {
    const dto = {
      name: 'Ann',
      email: 'a@test.dev',
      password: 'secret-pass',
      locale: 'en',
    };

    it('hashes the password, does not store a token and sends a signed-token email', async () => {
      userRepository.checkUserEmailExist.mockResolvedValue(null);
      userRepository.createUser.mockResolvedValue({ id: 'u1' });

      const result = await service.createAccount(dto as never);

      expect(result).toEqual({ success: true });

      const created = userRepository.createUser.mock.calls[0][0];

      expect(created.password).not.toBe(dto.password);
      await expect(
        bcrypt.compare(dto.password, created.password),
      ).resolves.toBe(true);
      expect(created).not.toHaveProperty('verifiedToken');
      expect(emailVerification.createToken).toHaveBeenCalledWith(
        'u1',
        dto.email,
      );
      expect(emailService.sendVerificationEmail).toHaveBeenCalledWith(
        { email: dto.email, token: 'signed-token' },
        'en',
      );
    });

    it('normalizes email (trim + lowercase) before lookup and storage', async () => {
      userRepository.checkUserEmailExist.mockResolvedValue(null);
      userRepository.createUser.mockResolvedValue({ id: 'u1' });

      await service.createAccount({
        ...dto,
        email: '  A@Test.DEV ',
      } as never);

      expect(userRepository.checkUserEmailExist).toHaveBeenCalledWith(
        undefined,
        'a@test.dev',
      );
      expect(userRepository.createUser.mock.calls[0][0].email).toBe(
        'a@test.dev',
      );
    });

    it('rejects an already registered email with 409 AUTH_EMAIL_TAKEN and creates nothing', async () => {
      userRepository.checkUserEmailExist.mockResolvedValue({ id: 'u0' });

      await expect(service.createAccount(dto as never)).rejects.toMatchObject({
        status: 409,
        response: { code: ErrorCode.AUTH_EMAIL_TAKEN },
      });
      expect(userRepository.createUser).not.toHaveBeenCalled();
      expect(emailService.sendVerificationEmail).not.toHaveBeenCalled();
    });

    it('does not swallow unexpected creation errors (no email sent)', async () => {
      userRepository.checkUserEmailExist.mockResolvedValue(null);
      userRepository.createUser.mockRejectedValue(new Error('db down'));

      await expect(service.createAccount(dto as never)).rejects.toThrow(
        'db down',
      );
      expect(emailService.sendVerificationEmail).not.toHaveBeenCalled();
    });

    it('still succeeds when the verification email fails (account exists)', async () => {
      userRepository.checkUserEmailExist.mockResolvedValue(null);
      userRepository.createUser.mockResolvedValue({ id: 'u1' });
      emailService.sendVerificationEmail.mockRejectedValue(new Error('smtp'));

      await expect(service.createAccount(dto as never)).resolves.toEqual({
        success: true,
      });
    });
  });

  describe('login', () => {
    beforeEach(() => {
      authRepository.getUserCredentials.mockResolvedValue({
        id: 'u1',
        password: passwordHash,
      });
    });

    it('wrong password -> 401 AUTH_INVALID_CREDENTIALS, no SMS, no ticket', async () => {
      await expect(
        service.login({ ...creds, password: 'bad' } as never),
      ).rejects.toMatchObject({
        status: 401,
        response: { code: ErrorCode.AUTH_INVALID_CREDENTIALS },
      });
      expect(smsService.sendSmsCode).not.toHaveBeenCalled();
      expect(redis.store.size).toBe(0);
    });

    it('unknown user gets the same error as a wrong password', async () => {
      authRepository.getUserCredentials.mockResolvedValue(null);

      await expect(service.login(creds as never)).rejects.toMatchObject({
        status: 401,
        response: { code: ErrorCode.AUTH_INVALID_CREDENTIALS },
      });
    });

    it('user without a profile name is rejected as invalid credentials', async () => {
      authRepository.getUserLogin.mockResolvedValue(
        loginUser({ profile: { name: null, phone: '1' } }),
      );

      await expect(service.login(creds as never)).rejects.toMatchObject({
        status: 401,
      });
    });

    it('without 2FA returns a loginTicket stored in Redis as sha256 -> userId with TTL 300', async () => {
      authRepository.getUserLogin.mockResolvedValue(loginUser());

      const result = (await service.login(creds as never)) as {
        twoFactorRequired: boolean;
        loginTicket: string;
      };

      expect(result.twoFactorRequired).toBe(false);
      expect(result.loginTicket).toMatch(/^[A-Za-z0-9_-]{43}$/);
      expect(redis.store.get(ticketKey(result.loginTicket))).toBe('u1');
      expect(redis.ttl.get(ticketKey(result.loginTicket))).toBe(300);
      // Сам билет в Redis не хранится в открытом виде
      expect([...redis.store.keys()].join()).not.toContain(result.loginTicket);
      expect(smsService.sendSmsCode).not.toHaveBeenCalled();
    });

    it('issues a different ticket on every login', async () => {
      authRepository.getUserLogin.mockResolvedValue(loginUser());

      const a = (await service.login(creds as never)) as {
        loginTicket: string;
      };
      const b = (await service.login(creds as never)) as {
        loginTicket: string;
      };

      expect(a.loginTicket).not.toBe(b.loginTicket);
    });

    it('normalizes the email before lookup', async () => {
      authRepository.getUserLogin.mockResolvedValue(loginUser());

      await service.login({ ...creds, email: ' A@TEST.dev ' } as never);

      expect(authRepository.getUserCredentials).toHaveBeenCalledWith(
        'a@test.dev',
      );
    });

    it('with 2FA sends an SMS, returns the masked phone and NO ticket', async () => {
      authRepository.getUserLogin.mockResolvedValue(
        loginUser({ authSettings: { twoFactorEnabled: true } }),
      );

      const result = await service.login(creds as never);

      expect(smsService.sendSmsCode).toHaveBeenCalledWith({
        phoneNumber: '+380501234567',
      });
      expect(result).toEqual({
        twoFactorRequired: true,
        phoneMasked: '**********67',
      });
      expect(result).not.toHaveProperty('loginTicket');
      expect(
        [...redis.store.keys()].some((k) => k.startsWith('login-ticket:')),
      ).toBe(false);
    });

    it('2FA enabled without a phone: no ticket by password alone', async () => {
      authRepository.getUserLogin.mockResolvedValue(
        loginUser({
          authSettings: { twoFactorEnabled: true },
          profile: { name: 'Ann', phone: null },
        }),
      );

      await expect(service.login(creds as never)).rejects.toMatchObject({
        response: { code: ErrorCode.AUTH_INVALID_CREDENTIALS },
      });
      expect(smsService.sendSmsCode).not.toHaveBeenCalled();
      expect(
        [...redis.store.keys()].some((k) => k.startsWith('login-ticket:')),
      ).toBe(false);
    });

    it('does not expose the raw phone in any response', async () => {
      authRepository.getUserLogin.mockResolvedValue(
        loginUser({ authSettings: { twoFactorEnabled: true } }),
      );

      const result = await service.login(creds as never);

      expect(JSON.stringify(result)).not.toContain('+380501234567');
    });

    it('propagates repository failures (global filter turns them into 500)', async () => {
      authRepository.getUserLogin.mockRejectedValue(new Error('boom'));

      await expect(service.login(creds as never)).rejects.toThrow('boom');
    });
  });

  describe('validate (loginTicket)', () => {
    const issue = async () => {
      authRepository.getUserCredentials.mockResolvedValue({
        id: 'u1',
        password: passwordHash,
      });
      authRepository.getUserLogin.mockResolvedValue(loginUser());
      const r = (await service.login(creds as never)) as {
        loginTicket: string;
      };

      return r.loginTicket;
    };

    it('returns the user without sensitive fields', async () => {
      const loginTicket = await issue();

      authRepository.getUserLoginById.mockResolvedValue(loginUser());

      await expect(service.validate({ loginTicket })).resolves.toEqual({
        user: {
          id: 'u1',
          name: 'Ann',
          email: 'a@test.dev',
          role: 'USER',
          sessionVersion: 0,
        },
      });
      expect(authRepository.getUserLoginById).toHaveBeenCalledWith('u1');
    });

    it('returns the current sessionVersion from Redis (session-version:<userId>)', async () => {
      const loginTicket = await issue();

      authRepository.getUserLoginById.mockResolvedValue(loginUser());
      redis.store.set('session-version:u1', '4');

      const { user } = await service.validate({ loginTicket });

      expect(user.sessionVersion).toBe(4);
    });

    it('the ticket is one-time: the second validate gives 401 AUTH_TICKET_INVALID', async () => {
      const loginTicket = await issue();

      authRepository.getUserLoginById.mockResolvedValue(loginUser());

      await service.validate({ loginTicket });

      await expect(service.validate({ loginTicket })).rejects.toMatchObject({
        status: 401,
        response: { code: ErrorCode.AUTH_TICKET_INVALID },
      });
      expect(redis.getdel).toHaveBeenCalledTimes(2);
    });

    it('an unknown / forged ticket is rejected and no user is loaded', async () => {
      await expect(
        service.validate({ loginTicket: 'forged-ticket' }),
      ).rejects.toMatchObject({
        status: 401,
        response: { code: ErrorCode.AUTH_TICKET_INVALID },
      });
      expect(authRepository.getUserLoginById).not.toHaveBeenCalled();
    });

    it('a ticket is consumed even when the user has no profile name', async () => {
      const loginTicket = await issue();

      authRepository.getUserLoginById.mockResolvedValue(
        loginUser({ profile: { name: null, phone: '1' } }),
      );

      await expect(service.validate({ loginTicket })).rejects.toMatchObject({
        status: 401,
      });
      expect(redis.store.has(ticketKey(loginTicket))).toBe(false);
    });

    it('the ticket cannot be used with the user id as a ticket', async () => {
      await issue();

      await expect(
        service.validate({ loginTicket: 'u1' }),
      ).rejects.toMatchObject({ status: 401 });
    });
  });

  describe('twoFactor (verify-otp)', () => {
    const dto = { email: 'a@test.dev', code: '123456' };
    const otpKey = `login-otp:${sha256('a@test.dev')}`;

    const startOtp = async () => {
      authRepository.getUserCredentials.mockResolvedValue({
        id: 'u1',
        password: passwordHash,
      });
      authRepository.getUserLogin.mockResolvedValue(
        loginUser({ authSettings: { twoFactorEnabled: true } }),
      );
      await service.login(creds as never);
    };

    it('without a prior successful password step the code is not even checked', async () => {
      authRepository.getUserLogin.mockResolvedValue(loginUser());

      await expect(service.twoFactor(dto)).rejects.toMatchObject({
        status: 400,
        response: { code: ErrorCode.AUTH_INVALID_OTP },
      });
      expect(smsService.verifySmsCode).not.toHaveBeenCalled();
    });

    it('a correct code returns a loginTicket and consumes the OTP state', async () => {
      await startOtp();
      smsService.verifySmsCode.mockResolvedValue(true);

      const result = await service.twoFactor(dto);

      expect(smsService.verifySmsCode).toHaveBeenCalledWith({
        phoneNumber: '+380501234567',
        code: '123456',
      });
      expect(redis.store.get(ticketKey(result.loginTicket))).toBe('u1');
      expect(redis.store.has(otpKey)).toBe(false);
    });

    it('the code is one-time: a repeated verify-otp is rejected', async () => {
      await startOtp();
      smsService.verifySmsCode.mockResolvedValue(true);

      await service.twoFactor(dto);

      await expect(service.twoFactor(dto)).rejects.toMatchObject({
        status: 400,
        response: { code: ErrorCode.AUTH_INVALID_OTP },
      });
      expect(smsService.verifySmsCode).toHaveBeenCalledTimes(1);
    });

    it('email is normalized, so case tricks use the same attempt counter', async () => {
      await startOtp();
      smsService.verifySmsCode.mockResolvedValue(true);

      await expect(
        service.twoFactor({ ...dto, email: ' A@Test.DEV ' }),
      ).resolves.toHaveProperty('loginTicket');
    });

    it('a wrong code -> 400 AUTH_INVALID_OTP and no ticket', async () => {
      await startOtp();
      smsService.verifySmsCode.mockResolvedValue(false);

      await expect(service.twoFactor(dto)).rejects.toMatchObject({
        status: 400,
        response: { code: ErrorCode.AUTH_INVALID_OTP },
      });
      expect(
        [...redis.store.keys()].some((k) => k.startsWith('login-ticket:')),
      ).toBe(false);
    });

    it(`attempts are limited: after ${LOGIN_OTP_MAX_ATTEMPTS} wrong codes even the right code is refused without asking the provider`, async () => {
      await startOtp();
      smsService.verifySmsCode.mockResolvedValue(false);

      for (let i = 0; i < LOGIN_OTP_MAX_ATTEMPTS; i++) {
        await expect(service.twoFactor(dto)).rejects.toMatchObject({
          status: 400,
        });
      }
      expect(smsService.verifySmsCode).toHaveBeenCalledTimes(
        LOGIN_OTP_MAX_ATTEMPTS,
      );

      smsService.verifySmsCode.mockResolvedValue(true);

      await expect(service.twoFactor(dto)).rejects.toMatchObject({
        status: 400,
        response: { code: ErrorCode.AUTH_INVALID_OTP },
      });
      expect(smsService.verifySmsCode).toHaveBeenCalledTimes(
        LOGIN_OTP_MAX_ATTEMPTS,
      );
      // Новый вход (новая SMS) сбрасывает состояние
      await service.login(creds as never);
      await expect(service.twoFactor(dto)).resolves.toHaveProperty(
        'loginTicket',
      );
    });

    it('rejects when the user has no phone', async () => {
      await startOtp();
      authRepository.getUserLogin.mockResolvedValue(
        loginUser({ profile: { name: 'Ann', phone: '' } }),
      );

      await expect(service.twoFactor(dto)).rejects.toMatchObject({
        status: 400,
      });
      expect(smsService.verifySmsCode).not.toHaveBeenCalled();
    });

    it('fails closed when the SMS provider throws', async () => {
      await startOtp();
      smsService.verifySmsCode.mockRejectedValue(new Error('twilio down'));

      await expect(service.twoFactor(dto)).rejects.toMatchObject({
        status: 400,
        response: { code: ErrorCode.AUTH_INVALID_OTP },
      });
    });
  });
});
