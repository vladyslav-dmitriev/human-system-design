import {
  createParamDecorator,
  ExecutionContext,
  InternalServerErrorException,
} from '@nestjs/common';
import type { Request } from 'express';

export interface RequestUser {
  id: string;
  email: string;
  name?: string;
  role?: string;
}

/** Запрос после AuthGuard: guard кладёт расшифрованную сессию в request.user */
export type AuthenticatedRequest = Request & { user?: RequestUser };

export const GetUser = createParamDecorator(
  (data: keyof RequestUser | undefined, context: ExecutionContext) => {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const user = request.user;

    if (!user) {
      throw new InternalServerErrorException(
        'User not found in request (check AuthGuard)',
      );
    }

    return data ? user[data] : user;
  },
);
