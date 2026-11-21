import {
  Body,
  Controller,
  HttpCode,
  Inject,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiCookieAuth,
  ApiHeader,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { SkipThrottle, Throttle } from '@nestjs/throttler';

import { AuthService } from './auth.service';
import {
  AccountCreateBodyDto,
  AccountCreateResponseDto,
  AccountLoginBodyDto,
  AccountLoginResponseDto,
  AccountTwoFactorBodyDto,
  AccountTwoFactorResponseDto,
  AccountValidateBodyDto,
  AccountValidateResponseDto,
} from './dto';
import { CaptchaGuard } from '../captcha/guards';
import { AuthGuard } from './guards/jwt-auth.guard';
import { InternalSecretGuard } from './guards/internal-secret.guard';
import { GetUser } from './decorators/get-user.decorator';
import { Serialize } from 'interceptors';

@ApiTags('service-auth')
@Controller('service-auth')
export class AuthController {
  constructor(@Inject(AuthService) private readonly authService: AuthService) {}

  @Post('register')
  @UseGuards(CaptchaGuard)
  @Serialize(AccountCreateResponseDto)
  @ApiOperation({ summary: 'Регистрация (нужна reCAPTCHA)' })
  @ApiResponse({ status: 201, type: AccountCreateResponseDto })
  @ApiResponse({ status: 400, description: 'VALIDATION_FAILED' })
  @ApiResponse({ status: 409, description: 'AUTH_EMAIL_TAKEN' })
  async createAccount(@Body() body: AccountCreateBodyDto) {
    return this.authService.createAccount(body);
  }

  @Post('login')
  @HttpCode(200)
  @UseGuards(CaptchaGuard)
  @Serialize(AccountLoginResponseDto)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @ApiOperation({
    summary:
      'Вход: loginTicket (без 2FA) или twoFactorRequired + phoneMasked + otpChallenge (SMS отправлено)',
  })
  @ApiResponse({ status: 200, type: AccountLoginResponseDto })
  @ApiResponse({ status: 401, description: 'AUTH_INVALID_CREDENTIALS' })
  async login(@Body() body: AccountLoginBodyDto) {
    return this.authService.login(body);
  }

  @Post('validate')
  @HttpCode(200)
  @UseGuards(InternalSecretGuard)
  // Без IP-лимита: все вызовы идут с одного адреса сервера web; доступ закрыт секретом
  @SkipThrottle()
  @Serialize(AccountValidateResponseDto)
  @ApiOperation({
    summary:
      'Обмен одноразового loginTicket на пользователя. Только для сервера web: заголовок X-Internal-Secret',
  })
  @ApiHeader({ name: 'X-Internal-Secret', required: true })
  @ApiResponse({ status: 200, type: AccountValidateResponseDto })
  @ApiResponse({
    status: 401,
    description:
      'AUTH_TICKET_INVALID (в т.ч. нет или неверный X-Internal-Secret)',
  })
  async validate(@Body() body: AccountValidateBodyDto) {
    return this.authService.validate(body);
  }

  @Post('verify-otp')
  @HttpCode(200)
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Serialize(AccountTwoFactorResponseDto)
  @ApiOperation({ summary: 'Проверка SMS-кода при входе, отдаёт loginTicket' })
  @ApiResponse({ status: 200, type: AccountTwoFactorResponseDto })
  @ApiResponse({ status: 400, description: 'AUTH_INVALID_OTP' })
  async twoFactor(@Body() body: AccountTwoFactorBodyDto) {
    return this.authService.twoFactor(body);
  }

  @Post('logout')
  @HttpCode(200)
  @UseGuards(AuthGuard)
  @Serialize(AccountCreateResponseDto)
  @ApiCookieAuth()
  @ApiOperation({ summary: 'Выход: отзывает все сессии пользователя' })
  @ApiResponse({ status: 200, type: AccountCreateResponseDto })
  @ApiResponse({ status: 401, description: 'UNAUTHORIZED' })
  async logout(@GetUser('id') userId: string) {
    return this.authService.logout(userId);
  }
}
