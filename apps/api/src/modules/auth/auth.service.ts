import { createHash, randomBytes } from 'crypto';
import bcrypt from 'bcrypt';
import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type Redis from 'ioredis';

import {
  AccountCreateBodyDto,
  AccountLoginBodyDto,
  AccountValidateBodyDto,
  AccountTwoFactorBodyDto,
} from './dto';
import { normalizeEmail } from './dto/common';
import { EmailService } from '../sender/email';
import { EmailVerificationService } from '../sender/email/email-verification.service';
import { SmsService } from '../sender/sms';
import { AuthRepository } from './auth.repository';
import { UserRepository } from '../user';
import { REDIS_CLIENT, bumpSessionVersion, getSessionVersion } from '../redis';
import { ErrorCode } from '../../common/errors';

const LOGIN_TICKET_PREFIX = 'login-ticket:';
const LOGIN_TICKET_TTL_SECONDS = 300;

/**
 * Состояние «пароль проверен, ждём OTP» для входа с 2FA:
 * `login-otp:<sha256(otpChallenge)>` = userId, отдельный счётчик попыток
 * `login-otp-attempts:<sha256>` (атомарный INCR, TTL ставится до первого INCR).
 */
const LOGIN_OTP_PREFIX = 'login-otp:';
const LOGIN_OTP_ATTEMPTS_PREFIX = 'login-otp-attempts:';
const LOGIN_OTP_TTL_SECONDS = 300;
export const LOGIN_OTP_MAX_ATTEMPTS = 5;

const sha256 = (value: string) =>
  createHash('sha256').update(value).digest('hex');

// Хеш для сравнения, когда пользователя нет: время ответа не выдаёт существование email
const DUMMY_HASH = bcrypt.hashSync('dummy-password-for-timing', 10);

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @Inject(AuthRepository) private readonly authRepository: AuthRepository,
    @Inject(UserRepository) private readonly userRepository: UserRepository,
    @Inject(EmailService) private readonly emailService: EmailService,
    @Inject(EmailVerificationService)
    private readonly emailVerification: EmailVerificationService,
    @Inject(SmsService) private readonly smsService: SmsService,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
  ) {}

  /** Возвращает id пользователя, если email и пароль верные. */
  private async checkCredentials(
    email: string,
    password: string,
  ): Promise<string | null> {
    const user = await this.authRepository.getUserCredentials(email);
    const isPasswordValid = await bcrypt.compare(
      password,
      user?.password ?? DUMMY_HASH,
    );

    return user && isPasswordValid ? user.id : null;
  }

  private async issueLoginTicket(userId: string): Promise<string> {
    const ticket = randomBytes(32).toString('base64url');

    await this.redis.set(
      `${LOGIN_TICKET_PREFIX}${sha256(ticket)}`,
      userId,
      'EX',
      LOGIN_TICKET_TTL_SECONDS,
    );

    return ticket;
  }

  async createAccount(dto: AccountCreateBodyDto) {
    const { name, password, locale } = dto;
    const email = normalizeEmail(dto.email);

    const existingUser = await this.userRepository.checkUserEmailExist(
      undefined,
      email,
    );

    if (existingUser) {
      throw new ConflictException({
        code: ErrorCode.AUTH_EMAIL_TAKEN,
        message: 'Email is already registered',
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    let userId: string;

    try {
      const user = await this.userRepository.createUser({
        name,
        email,
        password: hashedPassword,
      });

      userId = user.id;
    } catch (error) {
      // Гонка двух регистраций с одним email
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException({
          code: ErrorCode.AUTH_EMAIL_TAKEN,
          message: 'Email is already registered',
        });
      }

      throw error;
    }

    try {
      await this.emailService.sendVerificationEmail(
        { email, token: this.emailVerification.createToken(userId, email) },
        locale,
      );
    } catch (error) {
      // Аккаунт уже создан: письмо можно запросить повторно через send-verification
      this.logger.error(`Verification email failed: ${String(error)}`);
    }

    return { success: true };
  }

  async login(dto: AccountLoginBodyDto) {
    const email = normalizeEmail(dto.email);
    const userId = await this.checkCredentials(email, dto.password);

    if (!userId) {
      throw this.invalidCredentials();
    }

    const user = await this.authRepository.getUserLogin(email);

    if (!user?.profile?.name) {
      throw this.invalidCredentials();
    }

    if (user.authSettings?.twoFactorEnabled && !user.profile.phone) {
      // 2FA включена, а номера нет: не пускаем по одному паролю
      this.logger.warn(`2FA enabled without phone for user ${user.id}`);
      throw this.invalidCredentials();
    }

    if (user.authSettings?.twoFactorEnabled && user.profile.phone) {
      // SMS идёт через те же счётчики (пользователь, номер, сутки), что и sender/sms/send:
      // повторный login не даёт обойти лимит. Челлендж создаётся только после отправки.
      await this.smsService.sendSmsCode({
        phoneNumber: user.profile.phone,
        userId: user.id,
      });

      return {
        twoFactorRequired: true,
        phoneMasked: maskPhoneNumber(user.profile.phone),
        otpChallenge: await this.issueOtpChallenge(user.id),
      };
    }

    return {
      twoFactorRequired: false,
      loginTicket: await this.issueLoginTicket(user.id),
    };
  }

  async validate(dto: AccountValidateBodyDto) {
    // GETDEL: билет одноразовый, повторное использование даёт 401
    const userId = await this.redis.getdel(
      `${LOGIN_TICKET_PREFIX}${sha256(dto.loginTicket)}`,
    );

    if (!userId) {
      throw this.invalidTicket();
    }

    const user = await this.authRepository.getUserLoginById(userId);

    if (!user?.profile?.name) {
      throw this.invalidTicket();
    }

    return {
      user: {
        id: user.id,
        name: user.profile.name,
        email: user.email,
        role: user.role,
        sessionVersion: await getSessionVersion(this.redis, user.id),
      },
    };
  }

  private async issueOtpChallenge(userId: string): Promise<string> {
    const challenge = randomBytes(32).toString('base64url');

    await this.redis.set(
      `${LOGIN_OTP_PREFIX}${sha256(challenge)}`,
      userId,
      'EX',
      LOGIN_OTP_TTL_SECONDS,
    );

    return challenge;
  }

  async twoFactor(dto: AccountTwoFactorBodyDto) {
    const hash = sha256(dto.otpChallenge);
    const key = `${LOGIN_OTP_PREFIX}${hash}`;
    const attemptsKey = `${LOGIN_OTP_ATTEMPTS_PREFIX}${hash}`;

    // Челлендж выдаёт только login() после проверки пароля
    const userId = await this.redis.get(key);

    if (userId === null) {
      throw this.invalidOtp();
    }

    // Счётчик атомарный: TTL ставится SET NX до INCR (INCR TTL не трогает), окна без TTL нет
    await this.redis.set(attemptsKey, '0', 'EX', LOGIN_OTP_TTL_SECONDS, 'NX');
    const attempts = await this.redis.incr(attemptsKey);

    if (attempts > LOGIN_OTP_MAX_ATTEMPTS) {
      await this.redis.del(key, attemptsKey);
      throw this.invalidOtp();
    }

    const user = await this.authRepository.getUserLoginById(userId);

    if (!user?.profile?.phone || !user.authSettings?.twoFactorEnabled) {
      throw this.invalidOtp();
    }

    let isCodeValid = false;

    try {
      isCodeValid = await this.smsService.verifySmsCode({
        phoneNumber: user.profile.phone,
        code: dto.code,
      });
    } catch (error) {
      this.logger.error(`OTP verification failed: ${String(error)}`);
    }

    if (!isCodeValid) {
      throw this.invalidOtp();
    }

    // Код одноразовый: GETDEL челленджа решает гонку параллельных запросов с верным кодом
    if ((await this.redis.getdel(key)) === null) {
      throw this.invalidOtp();
    }

    await this.redis.del(attemptsKey);

    return { loginTicket: await this.issueLoginTicket(user.id) };
  }

  /** Выход: INCR версии сессии отзывает все выданные сессии пользователя. */
  async logout(userId: string) {
    await bumpSessionVersion(this.redis, userId);

    return { success: true };
  }

  private invalidCredentials() {
    return new UnauthorizedException({
      code: ErrorCode.AUTH_INVALID_CREDENTIALS,
      message: 'Invalid email or password',
    });
  }

  private invalidTicket() {
    return new UnauthorizedException({
      code: ErrorCode.AUTH_TICKET_INVALID,
      message: 'Login ticket is invalid or expired',
    });
  }

  private invalidOtp() {
    return new BadRequestException({
      code: ErrorCode.AUTH_INVALID_OTP,
      message: 'Invalid or expired code',
    });
  }
}

function maskPhoneNumber(phone: string) {
  const digits = String(phone).replace(/\D/g, '');

  return '*'.repeat(10) + digits.slice(-2);
}
