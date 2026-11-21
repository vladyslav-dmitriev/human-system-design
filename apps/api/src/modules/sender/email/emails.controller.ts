import {
  Body,
  Headers,
  Controller,
  Get,
  HttpCode,
  Post,
  Query,
  HttpException,
  HttpStatus,
  Inject,
  UseGuards,
} from '@nestjs/common';
import type Redis from 'ioredis';
import { ApiCookieAuth, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';

import { EmailVerificationService } from './email-verification.service';
import { EmailService } from './email.service';
import { EmailSuccessResponseDto, EmailVerifyQueryDto } from './dto';
import { AuthGuard } from '../../auth/guards/jwt-auth.guard';
import { GetUser } from '../../auth/decorators/get-user.decorator';
import { REDIS_CLIENT } from '../../redis';
import { UserRepository } from '../../user/user.repository';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ErrorCode } from '../../../common/errors';
import { Serialize } from 'interceptors';

/** Повторное письмо подтверждения: не чаще одного раза в 60 секунд на пользователя. */
export const VERIFICATION_RESEND_WINDOW_SECONDS = 60;
export const verificationResendKey = (userId: string) =>
  `email-verification-sent:${userId}`;

@ApiTags('sender/emails')
@Controller('sender/emails')
export class EmailsController {
  constructor(
    @Inject(EmailService) private readonly service: EmailService,
    @Inject(EmailVerificationService)
    private readonly verification: EmailVerificationService,
    @Inject(UserRepository) private readonly userRepository: UserRepository,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
  ) {}

  @Post('send-verification')
  @HttpCode(200)
  @UseGuards(AuthGuard)
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  @Serialize(EmailSuccessResponseDto)
  @ApiCookieAuth()
  @ApiResponse({ status: 200, type: EmailSuccessResponseDto })
  @ApiResponse({ status: 401, description: 'Нет сессии' })
  @ApiResponse({
    status: 429,
    description: 'RATE_LIMITED: письмо уже отправлено в последние 60 секунд',
  })
  async sendVerificationEmail(
    @GetUser('id') userId: string,
    @Headers('accept-language') lang: string,
  ) {
    const user = await this.userRepository.getUserById(userId);

    if (!user) {
      throw new NotFoundException({
        code: ErrorCode.NOT_FOUND,
        message: 'User not found',
      });
    }

    if (!user.authSettings?.isVerified) {
      const userLocale = lang && lang.includes('uk') ? 'uk' : 'en';
      const key = verificationResendKey(user.id);

      // SET NX EX: окно 60 с, пока оно не истекло, повторная отправка запрещена
      const claimed = await this.redis.set(
        key,
        '1',
        'EX',
        VERIFICATION_RESEND_WINDOW_SECONDS,
        'NX',
      );

      if (claimed === null) {
        throw new HttpException(
          {
            code: ErrorCode.RATE_LIMITED,
            message: 'Verification email was sent recently, try again later',
          },
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }

      try {
        await this.service.sendVerificationEmail(
          {
            email: user.email,
            token: this.verification.createToken(user.id, user.email),
          },
          userLocale,
        );
      } catch (error) {
        // Письмо не ушло: окно не расходуем, пользователь может повторить сразу
        await this.redis.del(key).catch(() => undefined);
        throw error;
      }
    }

    return { success: true };
  }

  @Get('verify-email')
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Serialize(EmailSuccessResponseDto)
  @ApiResponse({ status: 200, type: EmailSuccessResponseDto })
  @ApiResponse({ status: 400, description: 'EMAIL_TOKEN_INVALID' })
  async verifyEmail(@Query() query: EmailVerifyQueryDto) {
    const invalid = () =>
      new BadRequestException({
        code: ErrorCode.EMAIL_TOKEN_INVALID,
        message: 'Verification token is invalid or expired',
      });

    const parsed = this.verification.parseUserId(query.token);

    if (!parsed || parsed.exp < Date.now()) {
      throw invalid();
    }

    const user = await this.userRepository.getUserById(parsed.userId);

    if (!user || !this.verification.verifySignature(query.token, user.email)) {
      throw invalid();
    }

    await this.userRepository.markEmailVerified(user.id);

    return { success: true };
  }
}
