import { Module } from '@nestjs/common';

import { SmsService } from './sms.service';
import { TwilioService } from './providers/twilio.service';
import { SmsController } from './sms.controller';
import { CaptchaModule } from '../../captcha';

@Module({
  imports: [CaptchaModule],
  providers: [
    {
      provide: 'SMS_PROVIDER',
      useClass: TwilioService,
    },
    SmsService,
  ],
  controllers: [SmsController],
  exports: [SmsService],
})
export class SmsModule {}
