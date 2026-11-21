import { createHmac, timingSafeEqual } from 'crypto';
import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export const EMAIL_TOKEN_TTL_MS = 24 * 60 * 60 * 1000;

/**
 * Токен подтверждения почты без хранения в БД:
 * `base64url("<userId>.<exp>").<hmac>`, hmac считается по payload и текущему
 * email пользователя. Смена email делает ранее выданные токены недействительными.
 */
@Injectable()
export class EmailVerificationService {
  constructor(
    @Inject(ConfigService) private readonly configService: ConfigService,
  ) {}

  private sign(payload: string, email: string): string {
    // EMAIL_VERIFICATION_SECRET: отдельный ключ; если он не задан (или пуст), берём производный от JWT_SECRET
    const secret =
      this.configService.get<string>('EMAIL_VERIFICATION_SECRET') ||
      this.configService.get<string>('JWT_SECRET');

    if (!secret) {
      throw new Error('EMAIL_VERIFICATION_SECRET (or JWT_SECRET) is not set');
    }

    return createHmac('sha256', `email-verification:${secret}`)
      .update(`${payload}\n${email}`)
      .digest('base64url');
  }

  createToken(userId: string, email: string, now = Date.now()): string {
    const payload = Buffer.from(
      `${userId}.${now + EMAIL_TOKEN_TTL_MS}`,
    ).toString('base64url');

    return `${payload}.${this.sign(payload, email)}`;
  }

  /** Достаёт userId из токена без проверки подписи: подпись проверяется после загрузки пользователя. */
  parseUserId(token: string): { userId: string; exp: number } | null {
    const [payload] = token.split('.');

    if (!payload) return null;

    const decoded = Buffer.from(payload, 'base64url').toString('utf8');
    const dot = decoded.lastIndexOf('.');

    if (dot <= 0) return null;

    const exp = Number(decoded.slice(dot + 1));

    if (!Number.isFinite(exp)) return null;

    return { userId: decoded.slice(0, dot), exp };
  }

  verifySignature(token: string, email: string): boolean {
    const parts = token.split('.');

    if (parts.length !== 2) return false;

    const [payload, signature] = parts;
    const expected = Buffer.from(this.sign(payload, email));
    const actual = Buffer.from(signature);

    return (
      actual.length === expected.length && timingSafeEqual(actual, expected)
    );
  }
}
