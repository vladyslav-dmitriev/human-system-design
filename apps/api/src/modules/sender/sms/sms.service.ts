import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { createHash } from 'crypto';
import { ConfigService } from '@nestjs/config';
import type Redis from 'ioredis';

import type { ISMSService } from './sms.interface';
import {
  SMS_DAILY_LIMIT_DEFAULT,
  SMS_DAILY_WINDOW_SECONDS,
  SMS_PHONE_LIMIT,
  SMS_SEND_LIMIT,
  SMS_SEND_WINDOW_SECONDS,
  pendingPhoneKey,
  smsDailyCounterKey,
  smsPhoneCounterKey,
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
    @Inject(ConfigService) private readonly configService: ConfigService,
  ) {}

  /**
   * Атомарный счётчик окна: SET NX EX создаёт ключ сразу с TTL, INCR TTL не трогает,
   * поэтому ключа без TTL (вечная блокировка) не бывает. true = лимит превышен.
   */
  private async isOverLimit(key: string, ttl: number, limit: number) {
    await this.redis.set(key, '0', 'EX', ttl, 'NX');

    return (await this.redis.incr(key)) > limit;
  }

  private rateLimited() {
    return new HttpException(
      { code: ErrorCode.RATE_LIMITED, message: 'Too many SMS requests' },
      HttpStatus.TOO_MANY_REQUESTS,
    );
  }

  /**
   * Лимиты отправки: на пользователя (если известен), на номер назначения и общий
   * суточный потолок. Любой вход (login, sender/sms/send) идёт через них.
   */
  private async consumeQuota(phone: string, userId?: string) {
    if (
      userId &&
      (await this.isOverLimit(
        smsSendCounterKey(userId),
        SMS_SEND_WINDOW_SECONDS,
        SMS_SEND_LIMIT,
      ))
    ) {
      throw this.rateLimited();
    }

    const phoneHash = createHash('sha256')
      .update(phone.replace(/\D/g, ''))
      .digest('hex');

    if (
      await this.isOverLimit(
        smsPhoneCounterKey(phoneHash),
        SMS_SEND_WINDOW_SECONDS,
        SMS_PHONE_LIMIT,
      )
    ) {
      throw this.rateLimited();
    }

    const dailyLimit =
      Number(this.configService.get('SMS_DAILY_LIMIT')) ||
      SMS_DAILY_LIMIT_DEFAULT;
    const day = new Date().toISOString().slice(0, 10);

    if (
      await this.isOverLimit(
        smsDailyCounterKey(day),
        SMS_DAILY_WINDOW_SECONDS,
        dailyLimit,
      )
    ) {
      throw this.rateLimited();
    }
  }

  async sendSmsCode(dto: { phoneNumber: string; userId?: string }) {
    await this.consumeQuota(dto.phoneNumber, dto.userId);

    return this.smsProvider.sendSmsCode({ phoneNumber: dto.phoneNumber });
  }

  /**
   * Отправка кода авторизованному пользователю. Номер берётся только из
   * серверных данных: ожидающий подтверждения номер (2FA) или номер профиля.
   */
  async sendCodeToUser(userId: string) {
    const pending = await this.redis.get(pendingPhoneKey(userId));
    const user = pending ? null : await this.userRepository.getUserById(userId);
    const phone = pending ?? user?.profile?.phone;

    if (!phone) {
      throw new BadRequestException({
        code: ErrorCode.VALIDATION_FAILED,
        message: 'Phone number is not set',
      });
    }

    return this.sendSmsCode({ phoneNumber: phone, userId });
  }

  async verifySmsCode(dto: { phoneNumber: string; code: string }) {
    return this.smsProvider.verifySmsCode({
      phoneNumber: dto.phoneNumber,
      code: dto.code,
    });
  }
}
