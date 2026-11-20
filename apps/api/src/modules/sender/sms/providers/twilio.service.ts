import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import twilio from 'twilio';

import type { ISMSService } from '../sms.interface';

@Injectable()
export class TwilioService implements ISMSService {
  private readonly logger = new Logger(TwilioService.name);
  private twilio: twilio.Twilio | undefined;
  private readonly twilioVerifyServiceSid: string | undefined;

  constructor(@Inject(ConfigService) private configService: ConfigService) {
    const twilioSid = this.configService.get<string>('TWILIO_SID');
    const twilioAuthToken = this.configService.get<string>('TWILIO_AUTH_TOKEN');
    this.twilioVerifyServiceSid = this.configService.get<string>(
      'TWILIO_VERIFY_SERVICE_SID',
    );

    if (!twilioSid || !twilioAuthToken) {
      throw new Error('Missing Twilio credentials');
    }

    try {
      this.twilio = twilio(twilioSid, twilioAuthToken);
    } catch (error) {
      // Невалидные креды не должны ронять приложение: без PAID_API клиент не нужен
      this.logger.warn(`Twilio client was not initialized: ${String(error)}`);
    }
  }

  private getVerifyService() {
    if (!this.twilio || !this.twilioVerifyServiceSid) {
      throw new Error('Twilio Verify is not configured');
    }

    return this.twilio.verify.v2.services(this.twilioVerifyServiceSid);
  }

  async sendSmsCode({ phoneNumber }: { phoneNumber: string }) {
    const paidApi = this.configService.get<string>('PAID_API');

    if (paidApi === 'enabled') {
      await this.getVerifyService().verifications.create({
        to: phoneNumber,
        channel: 'sms',
      });
    }

    return true;
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
      const result = await this.getVerifyService().verificationChecks.create({
        to: phoneNumber,
        code,
      });

      return result.status === 'approved';
    }

    return true;
  }
}
