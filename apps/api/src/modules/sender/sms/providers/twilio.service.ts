import { Inject, Injectable } from '@nestjs/common';
import * as Twilio from 'twilio';

import type { ISMSService } from '../sms.interface';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class TwilioService implements ISMSService {
  // @ts-ignore
  private twilio: Twilio | undefined;
  private twilioVerifyServiceSid: string | undefined;

  constructor(@Inject(ConfigService) private configService: ConfigService) {
    const twilioSid = this.configService.get<string>('TWILIO_SID');
    const twilioAuthToken = this.configService.get<string>('TWILIO_AUTH_TOKEN');
    const twilioVerifyServiceSid = this.configService.get<string>(
      'TWILIO_VERIFY_SERVICE_SID',
    );

    if (!twilioSid || !twilioAuthToken) {
      throw new Error('Missing Twilio credentials');
    }

    try {
      // @ts-ignore
      this.twilio = new Twilio(twilioSid, twilioAuthToken);
      this.twilioVerifyServiceSid = twilioVerifyServiceSid;
    } catch {}
  }

  async sendSmsCode({ phoneNumber }: { phoneNumber: string }) {
    const paidApi = this.configService.get<string>('PAID_API');

    if (paidApi === 'enabled') {
      return await this.twilio.verify.v2
        .services(this.twilioVerifyServiceSid)
        .verifications.create({ to: phoneNumber, channel: 'sms' });
    }

    return await Promise.resolve(true);
  }

  async verifySmsCode({
    phoneNumber,
    code,
  }: {
    phoneNumber: string;
    code: string;
  }) {
    const paidApi = this.configService.get<string>('PAID_API');

    if (paidApi === 'enabled') {
      const result = await this.twilio.verify.v2
        .services(this.twilioVerifyServiceSid)
        .verificationChecks.create({ to: phoneNumber, code });

      return result.status === 'approved';
    }

    return true;
  }
}
