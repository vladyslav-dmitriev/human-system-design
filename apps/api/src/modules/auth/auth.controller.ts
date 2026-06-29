import { Body, Controller, Inject, Post, UseGuards } from '@nestjs/common';
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

@Controller('service-auth')
export class AuthController {
  constructor(@Inject(AuthService) private readonly authService: AuthService) {}

  @Post('register')
  @UseGuards(CaptchaGuard)
  @Serialize(AccountCreateResponseDto)
  async createAccount(@Body() body: AccountCreateBodyDto) {
    return this.authService.createAccount(body);
  }

  @Post('login')
  @UseGuards(CaptchaGuard)
  @Serialize(AccountLoginResponseDto)
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  async login(@Body() body: AccountLoginBodyDto) {
    return this.authService.login(body);
  }

  @Post('validate')
  @Serialize(AccountValidateResponseDto)
  async validate(@Body() body: AccountValidateBodyDto) {
    return this.authService.validate(body);
  }

  @Post('verify-otp')
  @UseGuards(CaptchaGuard)
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  @Serialize(AccountTwoFactorResponseDto)
  async twoFactor(@Body() body: AccountTwoFactorBodyDto) {
    return this.authService.twoFactor(body);
  }
}
