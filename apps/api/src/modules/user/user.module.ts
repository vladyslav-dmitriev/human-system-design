import { Module, forwardRef } from '@nestjs/common';
import { UserService } from './user.service';
import { UsersController } from './users.controller';
import { UserRepository } from './user.repository';
import { SmsModule } from '../sender/sms';

@Module({
  imports: [forwardRef(() => SmsModule)],
  controllers: [UsersController],
  providers: [UserRepository, UserService],
  exports: [UserRepository, UserService],
})
export class UserModule {}
