import bcrypt from 'bcrypt';

import { AuthService } from './auth.service';
import type { AccountTwoFactorBodyDto } from './dto';

jest.mock('../sender/email', () => ({ EmailService: class EmailService {} }));
jest.mock('../sender/sms', () => ({ SmsService: class SmsService {} }));
jest.mock('../user', () => ({ UserRepository: class UserRepository {} }));
jest.mock('./auth.repository', () => ({
  AuthRepository: class AuthRepository {},
}));

describe('AuthService', () => {
  const authRepository = {
    getUserCredentials: jest.fn(),
    getUserLogin: jest.fn(),
  };
  const userRepository = {
    checkUserEmailExist: jest.fn(),
    createUser: jest.fn(),
  };
  const emailService = { sendVerificationEmail: jest.fn() };
  const smsService = { sendSmsCode: jest.fn(), verifySmsCode: jest.fn() };

  let service: AuthService;
  let passwordHash: string;

  beforeAll(async () => {
    passwordHash = await bcrypt.hash('correct-password', 4);
  });

  beforeEach(() => {
    jest.resetAllMocks();
    service = new AuthService(
      authRepository as never,
      userRepository as never,
      emailService as never,
      smsService as never,
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

  describe('validateCredentials', () => {
    it('returns true for a correct password', async () => {
      authRepository.getUserCredentials.mockResolvedValue({
        password: passwordHash,
      });

      await expect(service.validateCredentials(creds)).resolves.toBe(true);
    });

    it('returns false for a wrong password', async () => {
      authRepository.getUserCredentials.mockResolvedValue({
        password: passwordHash,
      });

      await expect(
        service.validateCredentials({ ...creds, password: 'nope' }),
      ).resolves.toBe(false);
    });

    it('returns false for an unknown user', async () => {
      authRepository.getUserCredentials.mockResolvedValue(null);

      await expect(service.validateCredentials(creds)).resolves.toBe(false);
    });

    it('returns false (does not throw) when the repository fails', async () => {
      authRepository.getUserCredentials.mockRejectedValue(new Error('db down'));

      await expect(service.validateCredentials(creds)).resolves.toBe(false);
    });
  });

  describe('createAccount', () => {
    const dto = {
      name: 'Ann',
      email: 'a@test.dev',
      password: 'secret-pass',
      locale: 'en',
    };

    it('hashes the password, stores a random token and sends the email', async () => {
      userRepository.checkUserEmailExist.mockResolvedValue(null);
      userRepository.createUser.mockResolvedValue({ id: 'u1' });

      const result = await service.createAccount(dto as never);

      expect(result).toEqual({ success: true });

      const created = userRepository.createUser.mock.calls[0][0];

      expect(created.password).not.toBe(dto.password);
      await expect(
        bcrypt.compare(dto.password, created.password),
      ).resolves.toBe(true);
      expect(created.verifiedToken).toMatch(/^[0-9a-f]{64}$/);
      expect(created.isVerified).toBe(false);
      expect(emailService.sendVerificationEmail).toHaveBeenCalledWith(
        { email: dto.email, token: created.verifiedToken },
        'en',
      );
    });

    it('generates a different token for each registration', async () => {
      userRepository.checkUserEmailExist.mockResolvedValue(null);
      userRepository.createUser.mockResolvedValue({ id: 'u1' });

      await service.createAccount(dto as never);
      await service.createAccount(dto as never);

      const [t1, t2] = userRepository.createUser.mock.calls.map(
        (c) => c[0].verifiedToken,
      );

      expect(t1).not.toBe(t2);
    });

    it('rejects an already registered email and creates nothing', async () => {
      userRepository.checkUserEmailExist.mockResolvedValue({ id: 'u0' });

      const result = await service.createAccount(dto as never);

      expect(result).toHaveProperty('error');
      expect(userRepository.createUser).not.toHaveBeenCalled();
      expect(emailService.sendVerificationEmail).not.toHaveBeenCalled();
    });

    it('returns an error object when creation fails', async () => {
      userRepository.checkUserEmailExist.mockResolvedValue(null);
      userRepository.createUser.mockRejectedValue(new Error('unique'));

      await expect(service.createAccount(dto as never)).resolves.toHaveProperty(
        'error',
      );
      expect(emailService.sendVerificationEmail).not.toHaveBeenCalled();
    });
  });

  describe('login', () => {
    beforeEach(() => {
      authRepository.getUserCredentials.mockResolvedValue({
        password: passwordHash,
      });
    });

    it('returns null for wrong credentials and sends no SMS', async () => {
      const result = await service.login({
        ...creds,
        password: 'bad',
      } as never);

      expect(result).toBeNull();
      expect(smsService.sendSmsCode).not.toHaveBeenCalled();
    });

    // BUG: см. FIX.md «login отвергает любого пользователя с именем»
    it.failing('logs in a user with name and phone without 2FA', async () => {
      authRepository.getUserLogin.mockResolvedValue(loginUser());

      const result = await service.login(creds as never);

      expect(result).toMatchObject({ success: true, twoFactorEnabled: false });
    });

    // BUG: см. FIX.md «login отвергает любого пользователя с именем»
    it.failing('sends an SMS and masks the phone when 2FA is on', async () => {
      authRepository.getUserLogin.mockResolvedValue(
        loginUser({ authSettings: { twoFactorEnabled: true } }),
      );

      const result = await service.login(creds as never);

      expect(smsService.sendSmsCode).toHaveBeenCalledWith({
        phoneNumber: '+380501234567',
      });
      expect(result).toMatchObject({
        success: true,
        twoFactorEnabled: true,
        phone: '**********67',
      });
    });

    it('does not expose the raw phone in any response', async () => {
      authRepository.getUserLogin.mockResolvedValue(loginUser());

      const result = await service.login(creds as never);

      expect(JSON.stringify(result)).not.toContain('+380501234567');
    });

    it('returns a generic error when the repository throws', async () => {
      authRepository.getUserLogin.mockRejectedValue(new Error('boom'));

      await expect(service.login(creds as never)).resolves.toEqual({
        error: 'Error logging in',
      });
    });
  });

  describe('validate', () => {
    beforeEach(() => {
      authRepository.getUserCredentials.mockResolvedValue({
        password: passwordHash,
      });
    });

    it('returns the user without sensitive fields', async () => {
      authRepository.getUserLogin.mockResolvedValue(loginUser());

      const result = await service.validate(creds);

      expect(result).toEqual({
        user: { id: 'u1', name: 'Ann', email: 'a@test.dev', role: 'USER' },
      });
    });

    it('returns the same generic error for wrong password and unknown user', async () => {
      authRepository.getUserCredentials.mockResolvedValueOnce(null);
      const unknown = await service.validate(creds);

      const wrong = await service.validate({ ...creds, password: 'bad' });

      expect(unknown).toEqual({ error: 'Invalid email or password' });
      expect(wrong).toEqual(unknown);
    });

    it('rejects a user without a profile name', async () => {
      authRepository.getUserLogin.mockResolvedValue(
        loginUser({ profile: { name: null, phone: '1' } }),
      );

      await expect(service.validate(creds)).resolves.toEqual({
        error: 'Invalid email or password',
      });
    });
  });

  describe('twoFactor', () => {
    const dto = {
      ...creds,
      code: '123456',
    } as AccountTwoFactorBodyDto;

    beforeEach(() => {
      authRepository.getUserCredentials.mockResolvedValue({
        password: passwordHash,
      });
      authRepository.getUserLogin.mockResolvedValue(loginUser());
    });

    it('returns null for wrong credentials without checking the code', async () => {
      const result = await service.twoFactor({ ...dto, password: 'bad' });

      expect(result).toBeNull();
      expect(smsService.verifySmsCode).not.toHaveBeenCalled();
    });

    it('returns the user when the code is approved', async () => {
      smsService.verifySmsCode.mockResolvedValue(true);

      const result = await service.twoFactor(dto);

      expect(smsService.verifySmsCode).toHaveBeenCalledWith({
        phoneNumber: '+380501234567',
        code: '123456',
      });
      expect(result).toMatchObject({ success: true, user: { id: 'u1' } });
    });

    it('rejects a wrong code', async () => {
      smsService.verifySmsCode.mockResolvedValue(false);

      await expect(service.twoFactor(dto)).resolves.toEqual({
        error: 'Invalid email or password',
      });
    });

    it('rejects when the user has no phone', async () => {
      authRepository.getUserLogin.mockResolvedValue(
        loginUser({ profile: { name: 'Ann', phone: '' } }),
      );

      await expect(service.twoFactor(dto)).resolves.toHaveProperty('error');
      expect(smsService.verifySmsCode).not.toHaveBeenCalled();
    });

    it('fails closed when the SMS provider throws', async () => {
      smsService.verifySmsCode.mockRejectedValue(new Error('twilio down'));

      await expect(service.twoFactor(dto)).resolves.toHaveProperty('error');
    });
  });
});
