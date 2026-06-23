import {
  createParamDecorator,
  ExecutionContext,
  InternalServerErrorException,
} from '@nestjs/common';

export interface RequestUser {
  id: string;
  email: string;
}

export const GetUser = createParamDecorator(
  (data: keyof RequestUser | undefined, context: ExecutionContext) => {
    const request = context.switchToHttp().getRequest();
    const user = request.user as RequestUser;

    if (!user) {
      throw new InternalServerErrorException(
        'User not found in request (check AuthGuard)',
      );
    }

    return data ? user[data] : user;
  },
);
