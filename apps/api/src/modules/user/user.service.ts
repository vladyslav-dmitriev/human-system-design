import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import bcrypt from 'bcrypt';
import type Redis from 'ioredis';

import { UserRepository } from './user.repository';
import {
  UserUpdateEmailBodyDto,
  UserUpdatePasswordBodyDto,
  UserSetTwoFactorBodyDto,
} from './dto';
import { SmsService } from 'modules/sender/sms';
import {
  PENDING_PHONE_TTL_SECONDS,
  pendingPhoneKey,
} from '../sender/sms/sms.constants';
import { EmailService } from '../sender/email/email.service';
import { EmailVerificationService } from '../sender/email/email-verification.service';
import { REDIS_CLIENT, bumpSessionVersion } from '../redis';
import { ErrorCode } from '../../common/errors';

@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);

  constructor(
    @Inject(SmsService) private readonly smsService: SmsService,
    @Inject(EmailService) private readonly emailService: EmailService,
    @Inject(EmailVerificationService)
    private readonly emailVerification: EmailVerificationService,
    @Inject(UserRepository) private readonly userRepository: UserRepository,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
  ) {}

  async getUserProfile(userId: string) {
    const user = await this.userRepository.getUserById(userId);

    if (!user) {
      throw new NotFoundException({
        code: ErrorCode.NOT_FOUND,
        message: 'User not found',
      });
    }

    return user;
  }

  private async assertCurrentPassword(userId: string, password: string) {
    const user = await this.userRepository.getUserById(userId);

    if (!user) {
      throw new NotFoundException({
        code: ErrorCode.NOT_FOUND,
        message: 'User not found',
      });
    }

    if (!(await bcrypt.compare(password, user.password))) {
      throw new BadRequestException({
        code: ErrorCode.USER_INVALID_PASSWORD,
        message: 'Current password is incorrect',
      });
    }

    return user;
  }

  async updateEmail(
    userId: string,
    dto: UserUpdateEmailBodyDto,
    locale: 'uk' | 'en' = 'en',
  ) {
    const newEmail = dto.email.toLowerCase().trim();

    await this.assertCurrentPassword(userId, dto.currentPassword);

    const exists = await this.userRepository.checkUserEmailExist(
      userId,
      newEmail,
    );

    if (exists) {
      throw this.emailTaken();
    }

    try {
      await this.userRepository.updateUserEmail(userId, newEmail);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw this.emailTaken();
      }

      throw error;
    }

    // Смена email отзывает ранее выданные сессии
    await bumpSessionVersion(this.redis, userId);

    try {
      await this.emailService.sendVerificationEmail(
        {
          email: newEmail,
          token: this.emailVerification.createToken(userId, newEmail),
        },
        locale,
      );
    } catch (error) {
      // Email уже изменён: письмо можно запросить повторно через send-verification
      this.logger.error(`Verification email failed: ${String(error)}`);
    }

    return { success: true };
  }

  async updatePassword(userId: string, dto: UserUpdatePasswordBodyDto) {
    const user = await this.assertCurrentPassword(userId, dto.currentPassword);

    const isSameAsOld = await bcrypt.compare(dto.newPassword, user.password);

    if (isSameAsOld) {
      throw new BadRequestException({
        code: ErrorCode.VALIDATION_FAILED,
        message: 'New password must differ from the current one',
      });
    }

    const hashedNewPassword = await bcrypt.hash(dto.newPassword, 10);

    await this.userRepository.updateUser(
      { id: userId },
      { password: hashedNewPassword },
    );
    await bumpSessionVersion(this.redis, userId);

    return { success: true };
  }

  /** Запоминает номер, на который SMS уйдёт при включении 2FA (до подтверждения кодом). */
  async setPendingPhone(userId: string, phone: string) {
    await this.redis.set(
      pendingPhoneKey(userId),
      phone,
      'EX',
      PENDING_PHONE_TTL_SECONDS,
    );

    return { success: true };
  }

  async setTwoFactor(userId: string, dto: UserSetTwoFactorBodyDto) {
    const user = await this.userRepository.getUserById(userId);
    const pending = await this.redis.get(pendingPhoneKey(userId));

    // Включение: номер должен быть тем, на который отправили код.
    // Выключение: код приходит на сохранённый номер.
    const phone = dto.twoFactorEnabled
      ? (pending ?? user?.profile?.phone)
      : user?.profile?.phone;

    if (!phone || (dto.twoFactorEnabled && phone !== dto.phone)) {
      throw this.invalidOtp();
    }

    let isCodeValid = false;

    try {
      isCodeValid = await this.smsService.verifySmsCode({
        phoneNumber: phone,
        code: dto.code,
      });
    } catch {
      isCodeValid = false;
    }

    if (!isCodeValid) {
      throw this.invalidOtp();
    }

    await this.userRepository.updateUserTwoFactor({
      userId,
      phone: dto.twoFactorEnabled ? phone : null,
      twoFactorEnabled: dto.twoFactorEnabled,
    });
    await this.redis.del(pendingPhoneKey(userId));
    await bumpSessionVersion(this.redis, userId);

    return { success: true };
  }

  private emailTaken() {
    return new ConflictException({
      code: ErrorCode.USER_EMAIL_TAKEN,
      message: 'Email is already in use',
    });
  }

  private invalidOtp() {
    return new BadRequestException({
      code: ErrorCode.USER_INVALID_OTP,
      message: 'Invalid or expired code',
    });
  }
}
