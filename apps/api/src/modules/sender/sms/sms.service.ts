import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  Inject,
  forwardRef,
} from '@nestjs/common';
import type Redis from 'ioredis';

import type { ISMSService } from './sms.interface';
import {
  SMS_SEND_LIMIT,
  SMS_SEND_WINDOW_SECONDS,
  pendingPhoneKey,
  smsSendCounterKey,
} from './sms.constants';
import { UserRepository } from '../../user/user.repository';
import { REDIS_CLIENT } from '../../redis';
import { ErrorCode } from '../../../common/errors';

@Injectable()
export class SmsService implements ISMSService {
  constructor(
    @Inject('SMS_PROVIDER') private readonly smsProvider: ISMSService,
    @Inject(forwardRef(() => UserRepository))
    private readonly userRepository: UserRepository,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
  ) {}

  async sendSmsCode(dto: { phoneNumber: string }) {
    return this.smsProvider.sendSmsCode({ phoneNumber: dto.phoneNumber });
  }

  /**
   * Отправка кода авторизованному пользователю. Номер берётся только из
   * серверных данных: ожидающий подтверждения номер (2FA) или номер профиля.
   */
  async sendCodeToUser(userId: string) {
    const count = await this.redis.incr(smsSendCounterKey(userId));

    if (count === 1) {
      await this.redis.expire(
        smsSendCounterKey(userId),
        SMS_SEND_WINDOW_SECONDS,
      );
    }

    if (count > SMS_SEND_LIMIT) {
      throw new HttpException(
        { code: ErrorCode.RATE_LIMITED, message: 'Too many SMS requests' },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const pending = await this.redis.get(pendingPhoneKey(userId));
    const user = pending ? null : await this.userRepository.getUserById(userId);
    const phone = pending ?? user?.profile?.phone;

    if (!phone) {
      throw new BadRequestException({
        code: ErrorCode.VALIDATION_FAILED,
        message: 'Phone number is not set',
      });
    }

    return this.smsProvider.sendSmsCode({ phoneNumber: phone });
  }

  async verifySmsCode(dto: { phoneNumber: string; code: string }) {
    return this.smsProvider.verifySmsCode({
      phoneNumber: dto.phoneNumber,
      code: dto.code,
    });
  }
}
