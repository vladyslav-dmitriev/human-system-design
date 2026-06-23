import { Body, Controller, Inject, Post, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';

import { SmsService } from './sms.service';
import { SmsSendCodeBodyDto, SmsSendCodeResponseDto } from './dto';
import { CaptchaGuard } from '../../captcha/guards';
import { Serialize } from 'interceptors';

@Controller('/sender/sms')
export class SmsController {
  constructor(@Inject(SmsService) private readonly smsService: SmsService) {}

  @Post('send')
  @UseGuards(CaptchaGuard)
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  @Serialize(SmsSendCodeResponseDto)
  async sendSmsCode(@Body() dto: SmsSendCodeBodyDto) {
    const success = await this.smsService.sendSmsCode(dto);

    return { success };
  }
}
