import { randomBytes } from 'crypto';
import bcrypt from 'bcrypt';
import { Inject, Injectable } from '@nestjs/common';

import {
  AccountCreateBodyDto,
  AccountLoginBodyDto,
  AccountValidateBodyDto,
  AccountTwoFactorBodyDto,
} from './dto';
import { EmailService } from '../sender/email';
import { SmsService } from '../sender/sms';
import { AuthRepository } from './auth.repository';
import { UserRepository } from '../user';

@Injectable()
export class AuthService {
  constructor(
    @Inject(AuthRepository) private readonly authRepository: AuthRepository,
    @Inject(UserRepository) private readonly userRepository: UserRepository,
    @Inject(EmailService) private readonly emailService: EmailService,
    @Inject(SmsService) private readonly smsService: SmsService,
  ) {}

  async validateCredentials(dto: AccountValidateBodyDto) {
    const { email, password } = dto;

    try {
      const user = await this.authRepository.getUserCredentials(email);

      if (!user) {
        return false;
      }

      const isPasswordValid = await bcrypt.compare(password, user.password);

      if (!isPasswordValid) {
        return false;
      }

      return true;
    } catch {
      return false;
    }
  }

  async createAccount(dto: AccountCreateBodyDto) {
    const { name, email, password, locale } = dto;

    try {
      const existingUser = await this.userRepository.checkUserEmailExist(
        undefined,
        email,
      );

      if (existingUser) {
        return { error: 'Пользователь с таким email уже существует' };
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      const verificationToken = randomBytes(32).toString('hex');

      await this.userRepository.createUser({
        name,
        email,
        password: hashedPassword,
        verifiedToken: verificationToken,
        isVerified: false,
      });

      await this.emailService.sendVerificationEmail(
        { email, token: verificationToken },
        locale,
      );

      return { success: true };
    } catch {
      return { error: 'Что-то пошло не так при регистрации' };
    }
  }

  async login(dto: AccountLoginBodyDto) {
    const { email } = dto;

    try {
      const isCredentialsValid = await this.validateCredentials(dto);

      if (!isCredentialsValid) {
        return null;
      }

      const user = await this.authRepository.getUserLogin(email);

      if (!user?.profile?.phone || user?.profile?.name) {
        return { error: 'Invalid email or password' };
      }

      if (user.authSettings?.twoFactorEnabled && user.profile.phone) {
        await this.smsService.sendSmsCode({ phoneNumber: user.profile.phone });

        return {
          success: true,
          twoFactorEnabled: user.authSettings?.twoFactorEnabled,
          phone: maskPhoneNumber(user.profile.phone),
          user: {
            id: user.id,
            name: user.profile.name,
            email: user.email,
            role: user.role,
          },
        };
      }

      return {
        success: true,
        twoFactorEnabled: false,
        phone: null,
        user: {
          id: user.id,
          name: user.profile.name,
          email: user.email,
          role: user.role,
        },
      };
    } catch {
      return { error: 'Error logging in' };
    }
  }

  async validate(dto: AccountValidateBodyDto) {
    const { email } = dto;

    try {
      const isCredentialsValid = await this.validateCredentials(dto);

      if (!isCredentialsValid) {
        return { error: 'Invalid email or password' };
      }

      const user = await this.authRepository.getUserLogin(email);

      if (!user?.profile?.name) {
        return { error: 'Invalid email or password' };
      }

      return {
        user: {
          id: user.id,
          name: user.profile.name,
          email: user.email,
          role: user.role,
        },
      };
    } catch {
      return { error: 'Invalid email or password' };
    }
  }

  async twoFactor(dto: AccountTwoFactorBodyDto) {
    const { email, code } = dto;

    try {
      const isCredentialsValid = await this.validateCredentials(dto);

      if (!isCredentialsValid) {
        return null;
      }

      const user = await this.authRepository.getUserLogin(email);

      if (!user?.profile?.phone) {
        return { error: 'Invalid email or password' };
      }

      const isCodeValid = await this.smsService.verifySmsCode({
        phoneNumber: user.profile.phone,
        code,
      });

      if (!isCodeValid) {
        return { error: 'Invalid email or password' };
      }

      return {
        success: true,
        user: {
          id: user.id,
          name: user.profile?.name,
          email: user.email,
          role: user.role,
        },
      };
    } catch {
      return { error: 'Invalid email or password' };
    }
  }
}

function maskPhoneNumber(phone: string) {
  const str = String(phone);
  const digits = str.replace(/\D/g, '');

  if (digits.length < 2) {
    return '*'.repeat(10) + digits;
  }

  const lastTwo = digits.slice(-2);

  return '*'.repeat(10) + lastTwo;
}
