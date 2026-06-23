import {
  Controller,
  Get,
  UseGuards,
  Body,
  Inject,
  Patch,
  Post,
} from '@nestjs/common';
import { UserService } from './user.service';
import { AuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  UserGetProfileResponseDto,
  UserUpdateEmailBodyDto,
  UserUpdatePasswordBodyDto,
  UserSetTwoFactorBodyDto,
  UserUpdateEmailResponseDto,
  UserUpdatePasswordResponseDto,
  UserSetTwoFactorResponseDto,
} from './dto';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { Serialize } from 'interceptors';

@Controller('user')
export class UsersController {
  constructor(@Inject(UserService) private readonly userService: UserService) {}

  @Get('profile')
  @UseGuards(AuthGuard)
  @Serialize(UserGetProfileResponseDto)
  async profile(@GetUser('id') userId: string) {
    return this.userService.getUserProfile(userId);
  }

  @Patch('profile')
  @UseGuards(AuthGuard)
  @Serialize(UserUpdateEmailResponseDto)
  async updateEmail(
    @GetUser('id') userId: string,
    @Body() body: UserUpdateEmailBodyDto,
  ) {
    return this.userService.updateEmail(userId, body);
  }

  @Patch('profile/password')
  @UseGuards(AuthGuard)
  @Serialize(UserUpdatePasswordResponseDto)
  async updatePassword(
    @GetUser('id') userId: string,
    @Body() body: UserUpdatePasswordBodyDto,
  ) {
    return this.userService.updatePassword(userId, body);
  }

  @Post('profile/2fa')
  @UseGuards(AuthGuard)
  @Serialize(UserSetTwoFactorResponseDto)
  async setTwoFactor(
    @GetUser('id') userId: string,
    @Body() body: UserSetTwoFactorBodyDto,
  ) {
    await this.userService.setTwoFactor(userId, body);
  }
}
