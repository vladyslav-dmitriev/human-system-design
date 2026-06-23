import { Module, Global } from '@nestjs/common';

import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { UserModule } from '../user';
import { EmailModule } from '../sender/email';
import { SmsModule } from '../sender/sms';
import { CaptchaModule } from '../captcha';
import { AuthRepository } from './auth.repository';

@Global()
@Module({
  imports: [UserModule, EmailModule, SmsModule, CaptchaModule],
  controllers: [AuthController],
  providers: [AuthService, AuthRepository],
})
export class AuthModule {}
