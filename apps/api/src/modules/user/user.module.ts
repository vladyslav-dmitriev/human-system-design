import { Module, forwardRef } from '@nestjs/common';
import { UserService } from './user.service';
import { UsersController } from './users.controller';
import { UserRepository } from './user.repository';
import { SmsModule } from '../sender/sms';
import { EmailModule } from '../sender/email/email.module';

@Module({
  imports: [forwardRef(() => SmsModule), forwardRef(() => EmailModule)],
  controllers: [UsersController],
  providers: [UserRepository, UserService],
  exports: [UserRepository, UserService],
})
export class UserModule {}
