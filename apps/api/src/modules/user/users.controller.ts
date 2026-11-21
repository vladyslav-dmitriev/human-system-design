import {
  Controller,
  Get,
  UseGuards,
  Body,
  HttpCode,
  Inject,
  Patch,
  Post,
  Put,
} from '@nestjs/common';
import { ApiCookieAuth, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';

import { UserService } from './user.service';
import { AuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  UserGetProfileResponseDto,
  UserUpdateEmailBodyDto,
  UserUpdatePasswordBodyDto,
  UserSetTwoFactorBodyDto,
  UserSetPendingPhoneBodyDto,
  UserUpdateEmailResponseDto,
  UserUpdatePasswordResponseDto,
  UserSetTwoFactorResponseDto,
  UserSetPendingPhoneResponseDto,
} from './dto';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { Serialize } from 'interceptors';

@ApiTags('user')
@ApiCookieAuth()
@ApiResponse({ status: 401, description: 'Нет сессии' })
@Controller('user')
export class UsersController {
  constructor(@Inject(UserService) private readonly userService: UserService) {}

  @Get('profile')
  @UseGuards(AuthGuard)
  @Serialize(UserGetProfileResponseDto)
  @ApiResponse({ status: 200, type: UserGetProfileResponseDto })
  async profile(@GetUser('id') userId: string) {
    return this.userService.getUserProfile(userId);
  }

  @Patch('profile')
  @UseGuards(AuthGuard)
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Serialize(UserUpdateEmailResponseDto)
  @ApiResponse({ status: 200, type: UserUpdateEmailResponseDto })
  @ApiResponse({ status: 400, description: 'USER_INVALID_PASSWORD' })
  @ApiResponse({ status: 409, description: 'USER_EMAIL_TAKEN' })
  async updateEmail(
    @GetUser('id') userId: string,
    @Body() body: UserUpdateEmailBodyDto,
  ) {
    return this.userService.updateEmail(userId, body);
  }

  @Patch('profile/password')
  @UseGuards(AuthGuard)
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Serialize(UserUpdatePasswordResponseDto)
  @ApiResponse({ status: 200, type: UserUpdatePasswordResponseDto })
  @ApiResponse({ status: 400, description: 'USER_INVALID_PASSWORD' })
  async updatePassword(
    @GetUser('id') userId: string,
    @Body() body: UserUpdatePasswordBodyDto,
  ) {
    return this.userService.updatePassword(userId, body);
  }

  @Put('profile/phone')
  @UseGuards(AuthGuard)
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Serialize(UserSetPendingPhoneResponseDto)
  @ApiResponse({ status: 200, type: UserSetPendingPhoneResponseDto })
  async setPendingPhone(
    @GetUser('id') userId: string,
    @Body() body: UserSetPendingPhoneBodyDto,
  ) {
    return this.userService.setPendingPhone(userId, body.phone);
  }

  @Post('profile/2fa')
  @HttpCode(200)
  @UseGuards(AuthGuard)
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Serialize(UserSetTwoFactorResponseDto)
  @ApiResponse({ status: 200, type: UserSetTwoFactorResponseDto })
  @ApiResponse({ status: 400, description: 'USER_INVALID_OTP' })
  async setTwoFactor(
    @GetUser('id') userId: string,
    @Body() body: UserSetTwoFactorBodyDto,
  ) {
    return this.userService.setTwoFactor(userId, body);
  }
}
