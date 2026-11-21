import { Controller, HttpCode, Inject, Post, UseGuards } from '@nestjs/common';
import { ApiCookieAuth, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';

import { SmsService } from './sms.service';
import { SmsSendCodeResponseDto } from './dto';
import { AuthGuard } from '../../auth/guards/jwt-auth.guard';
import { GetUser } from '../../auth/decorators/get-user.decorator';
import { Serialize } from 'interceptors';

@ApiTags('sender/sms')
@Controller('/sender/sms')
export class SmsController {
  constructor(@Inject(SmsService) private readonly smsService: SmsService) {}

  @Post('send')
  @HttpCode(200)
  @UseGuards(AuthGuard)
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  @Serialize(SmsSendCodeResponseDto)
  @ApiCookieAuth()
  @ApiResponse({ status: 200, type: SmsSendCodeResponseDto })
  @ApiResponse({ status: 400, description: 'Номер не задан' })
  @ApiResponse({ status: 401, description: 'Нет сессии' })
  @ApiResponse({ status: 429, description: 'RATE_LIMITED' })
  async sendSmsCode(@GetUser('id') userId: string) {
    const success = await this.smsService.sendCodeToUser(userId);

    return { success };
  }
}
