import {
  Inject,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import twilio from 'twilio';

import type { ISMSService } from '../sms.interface';

/** Код dev-мока: только при SMS_DEV_MOCK=true и не в production (Joi запрещает флаг в production). */
export const DEV_OTP_CODE = '123456';

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

  private isProduction() {
    return this.configService.get<string>('NODE_ENV') === 'production';
  }

  private isDevMock() {
    const flag = this.configService.get<string | boolean>('SMS_DEV_MOCK');

    return !this.isProduction() && (flag === true || flag === 'true');
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

      return true;
    }

    if (!this.isDevMock()) {
      // Без Twilio и без явного SMS_DEV_MOCK «успешно отправить» нельзя: не имитируем отправку
      throw new ServiceUnavailableException('SMS provider is not enabled');
    }

    // Dev-мок: SMS не уходит, код фиксированный; номер в лог не пишем
    this.logger.warn(
      `[DEV MOCK] SMS not sent (SMS_DEV_MOCK=true). Use code ${DEV_OTP_CODE}`,
    );

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

    // Мок только при SMS_DEV_MOCK=true вне production и только с фиксированным кодом
    return this.isDevMock() && code === DEV_OTP_CODE;
  }
}
