import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import bcrypt from 'bcrypt';

import { UserRepository } from './user.repository';
import {
  UserUpdateEmailBodyDto,
  UserUpdatePasswordBodyDto,
  UserSetTwoFactorBodyDto,
} from './dto';
import { SmsService } from 'modules/sender/sms';
import { RabbitMQService } from 'modules/rabbitmq/services/rabbitmq.service';

@Injectable()
export class UserService {
  constructor(
    @Inject(RabbitMQService) private readonly rabbitMQService: RabbitMQService,
    @Inject(SmsService) private readonly smsService: SmsService,
    @Inject(UserRepository) private readonly userRepository: UserRepository,
  ) {}

  async getUserProfile(userId: string) {
    const emailProducer = this.rabbitMQService.getEmailProducer();

    const message = {
      to: 'test@example.com',
      subject: 'Тестовое письмо из API',
      body: 'Привет! Это тестовое сообщение из API',
      userId: 'test-user-123',
    };

    const result = await emailProducer.sendEmail(message);

    console.log('result', result);

    const user = await this.userRepository.getUserById(userId);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async updateEmail(userId: string, dto: UserUpdateEmailBodyDto) {
    const newEmail = dto.email.toLowerCase().trim();

    const exists = await this.userRepository.checkUserEmailExist(
      userId,
      newEmail,
    );

    if (exists) {
      throw new ConflictException(
        'Этот email адрес уже используется в системе',
      );
    }

    await this.userRepository.updateUser({ id: userId }, { email: newEmail });

    return { success: true };
  }

  async updatePassword(userId: string, dto: UserUpdatePasswordBodyDto) {
    const user = await this.userRepository.getUserById(userId);

    if (!user) throw new BadRequestException('User not found');

    const isMatch = await bcrypt.compare(dto.currentPassword, user.password);

    if (!isMatch) {
      throw new BadRequestException('Неверно указан текущий пароль');
    }

    const isSameAsOld = await bcrypt.compare(dto.newPassword, user.password);

    if (isSameAsOld) {
      throw new BadRequestException(
        'Новый пароль не должен совпадать со старым',
      );
    }

    const hashedNewPassword = await bcrypt.hash(dto.newPassword, 10);

    await this.userRepository.updateUser(
      { id: userId },
      { password: hashedNewPassword },
    );

    return { success: true };
  }

  async setTwoFactor(userId: string, dto: UserSetTwoFactorBodyDto) {
    try {
      const isCodeValid = await this.smsService.verifySmsCode({
        phoneNumber: dto.phone,
        code: dto.code,
      });

      if (!isCodeValid) {
        throw new BadRequestException('Invalid code');
      }

      await this.userRepository.updateUserTwoFactor({
        userId,
        phone: dto.twoFactorEnabled ? dto.phone : null,
        twoFactorEnabled: dto.twoFactorEnabled,
      });

      return { success: true };
    } catch {
      return { success: false };
    }
  }
}
