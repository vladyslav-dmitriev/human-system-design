import { Injectable, Inject } from '@nestjs/common';

import type { ISMSService } from './sms.interface';

@Injectable()
export class SmsService implements ISMSService {
  constructor(
    @Inject('SMS_PROVIDER') private readonly smsProvider: ISMSService,
  ) {}

  async sendSmsCode(dto: { phoneNumber: string }) {
    return this.smsProvider.sendSmsCode({ phoneNumber: dto.phoneNumber });
  }

  async verifySmsCode(dto: { phoneNumber: string; code: string }) {
    return this.smsProvider.verifySmsCode({
      phoneNumber: dto.phoneNumber,
      code: dto.code,
    });
  }
}
