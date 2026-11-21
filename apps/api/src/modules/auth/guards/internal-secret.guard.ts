import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';

import {
  hasValidInternalSecret,
  isInternalSecretRequired,
} from '../internal-auth';
import { ErrorCode } from '../../../common/errors';

/** Только для вызовов от сервера web: `X-Internal-Secret` = `INTERNAL_API_SECRET`. */
@Injectable()
export class InternalSecretGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    if (!isInternalSecretRequired()) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();

    if (!hasValidInternalSecret(request)) {
      throw new UnauthorizedException({
        code: ErrorCode.AUTH_TICKET_INVALID,
        message: 'Login ticket is invalid or expired',
      });
    }

    return true;
  }
}
