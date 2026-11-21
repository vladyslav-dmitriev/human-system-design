import {
  Body,
  Headers,
  Controller,
  Get,
  HttpCode,
  Post,
  Query,
  Inject,
  UseGuards,
} from '@nestjs/common';
import { ApiCookieAuth, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';

import { EmailVerificationService } from './email-verification.service';
import { EmailService } from './email.service';
import { EmailSuccessResponseDto, EmailVerifyQueryDto } from './dto';
import { AuthGuard } from '../../auth/guards/jwt-auth.guard';
import { GetUser } from '../../auth/decorators/get-user.decorator';
import { UserRepository } from '../../user/user.repository';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ErrorCode } from '../../../common/errors';
import { Serialize } from 'interceptors';

@ApiTags('sender/emails')
@Controller('sender/emails')
export class EmailsController {
  constructor(
    @Inject(EmailService) private readonly service: EmailService,
    @Inject(EmailVerificationService)
    private readonly verification: EmailVerificationService,
    @Inject(UserRepository) private readonly userRepository: UserRepository,
  ) {}

  @Post('send-verification')
  @HttpCode(200)
  @UseGuards(AuthGuard)
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  @Serialize(EmailSuccessResponseDto)
  @ApiCookieAuth()
  @ApiResponse({ status: 200, type: EmailSuccessResponseDto })
  @ApiResponse({ status: 401, description: 'Нет сессии' })
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

      await this.service.sendVerificationEmail(
        {
          email: user.email,
          token: this.verification.createToken(user.id, user.email),
        },
        userLocale,
      );
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
