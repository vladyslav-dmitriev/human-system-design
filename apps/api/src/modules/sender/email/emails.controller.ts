import {
  Body,
  Headers,
  Controller,
  Get,
  Post,
  Query,
  Inject,
} from '@nestjs/common';
import { EmailService } from './email.service';
import { EmailSendVerificationBodyDto } from './dto';

@Controller('sender/emails')
export class EmailsController {
  constructor(@Inject(EmailService) private readonly service: EmailService) {}

  @Post('send-verification')
  async sendVerificationEmail(
    @Body() body: EmailSendVerificationBodyDto,
    @Headers('accept-language') lang: string,
  ) {
    const userLocale = lang && lang.includes('uk') ? 'uk' : 'en';

    return this.service.sendVerificationEmail(body, userLocale);
  }

  @Get('verify-email')
  async verifyEmail(@Query('token') token: string) {
    // const user = await this.service.findUnique({
    //   where: { verifiedToken: token },
    // });

    // if (!user) {
    //   throw new BadRequestException('Неверный или протухший токен');
    // }

    // await this.service.update({
    //   where: { id: user.id },
    //   data: {
    //     isVerified: true,
    //     verifiedToken: null,
    //   },
    // });

    return { message: 'Email успешно подтвержден!' };
  }
}
