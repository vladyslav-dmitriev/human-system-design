import {
  Body,
  Controller,
  HttpCode,
  Inject,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';

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
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  @ApiOperation({
    summary:
      'Вход: loginTicket (без 2FA) или twoFactorRequired + phoneMasked (SMS отправлено)',
  })
  @ApiResponse({ status: 200, type: AccountLoginResponseDto })
  @ApiResponse({ status: 401, description: 'AUTH_INVALID_CREDENTIALS' })
  async login(@Body() body: AccountLoginBodyDto) {
    return this.authService.login(body);
  }

  @Post('validate')
  @HttpCode(200)
  @Serialize(AccountValidateResponseDto)
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  @ApiOperation({
    summary:
      'Обмен одноразового loginTicket на пользователя. Только для сервера web (nginx закрывает снаружи)',
  })
  @ApiResponse({ status: 200, type: AccountValidateResponseDto })
  @ApiResponse({ status: 401, description: 'AUTH_TICKET_INVALID' })
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
}
