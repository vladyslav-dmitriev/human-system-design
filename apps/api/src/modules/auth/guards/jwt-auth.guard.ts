import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { decode } from '@auth/core/jwt';

@Injectable()
export class AuthGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();

    const cookieName = request.cookies['authjs.session-token']
      ? 'authjs.session-token'
      : request.cookies['__Secure-authjs.session-token']
        ? '__Secure-authjs.session-token'
        : request.cookies['next-auth.session-token']
          ? 'next-auth.session-token'
          : request.cookies['__Secure-next-auth.session-token']
            ? '__Secure-next-auth.session-token'
            : null;

    if (!cookieName) {
      throw new UnauthorizedException(
        'Сессия отсутствует (кука не найдена в запросе)',
      );
    }

    const sessionToken = request.cookies[cookieName];

    try {
      const secret = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET;

      if (!secret) {
        throw new Error(
          'Критическая ошибка: AUTH_SECRET или NEXTAUTH_SECRET не заданы в .env бэкенда',
        );
      }

      const payload = await decode({
        token: sessionToken,
        secret: secret,
        salt: cookieName,
      });

      if (!payload) {
        throw new UnauthorizedException(
          'Не удалось расшифровать токен (вернулся пустой payload)',
        );
      }

      request.user = {
        id: payload.id || payload.sub,
        email: payload.email,
        name: payload.name,
        role: payload.role,
      };

      return true;
    } catch (error) {
      console.error('Критическая ошибка дешифрования куки Auth.js:', error);
      throw new UnauthorizedException(
        'Ошибка авторизации: невалидный токен сессии',
      );
    }
  }
}
