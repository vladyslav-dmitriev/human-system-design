import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';

import { ErrorCode } from '../errors';

export type ApiErrorBody = {
  statusCode: number;
  message: string | string[];
  error: string;
  code?: string;
};

const STATUS_TO_CODE: Partial<Record<number, ErrorCode>> = {
  [HttpStatus.BAD_REQUEST]: ErrorCode.VALIDATION_FAILED,
  [HttpStatus.UNAUTHORIZED]: ErrorCode.UNAUTHORIZED,
  [HttpStatus.FORBIDDEN]: ErrorCode.FORBIDDEN,
  [HttpStatus.CONFLICT]: ErrorCode.CONFLICT,
  [HttpStatus.PAYLOAD_TOO_LARGE]: ErrorCode.PAYLOAD_TOO_LARGE,
  [HttpStatus.NOT_FOUND]: ErrorCode.NOT_FOUND,
  [HttpStatus.TOO_MANY_REQUESTS]: ErrorCode.RATE_LIMITED,
};

const INTERNAL_MESSAGE = 'Internal server error';

const statusName = (status: number): string =>
  (HttpStatus[status] ?? 'Error')
    .toLowerCase()
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

const codeForStatus = (status: number): string | undefined =>
  status >= 500 ? ErrorCode.INTERNAL : STATUS_TO_CODE[status];

/** Ошибки Prisma определяем по полям, чтобы не импортировать сгенерированный клиент. */
const prismaErrorCode = (exception: unknown): string | null => {
  const error = exception as { name?: string; code?: unknown } | null;

  if (
    error?.name === 'PrismaClientKnownRequestError' &&
    typeof error.code === 'string'
  ) {
    return error.code;
  }

  return null;
};

/**
 * Приводит любое исключение к виду `{ statusCode, message, error, code }`.
 * Не отдаёт клиенту стек и тексты Prisma / сторонних SDK, 5xx логирует.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    if (host.getType() !== 'http') {
      throw exception;
    }

    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const body = this.toBody(exception);

    if (body.statusCode >= 500) {
      this.logger.error(
        `${request.method} ${request.url} -> ${body.statusCode}`,
        exception instanceof Error
          ? exception.stack
          : JSON.stringify(exception),
      );
    }

    if (response.headersSent) {
      return;
    }

    response.status(body.statusCode).json(body);
  }

  private toBody(exception: unknown): ApiErrorBody {
    if (exception instanceof HttpException) {
      return this.fromHttpException(exception);
    }

    const prismaCode = prismaErrorCode(exception);

    if (prismaCode === 'P2025') {
      return this.build(HttpStatus.NOT_FOUND, 'Not found');
    }

    if (prismaCode === 'P2002') {
      return this.build(HttpStatus.CONFLICT, 'Resource already exists');
    }

    // Ошибки http-errors (битый JSON, слишком большое тело и т.п.)
    const httpLike = exception as {
      status?: unknown;
      statusCode?: unknown;
      expose?: unknown;
      message?: unknown;
    } | null;
    const status = httpLike?.status ?? httpLike?.statusCode;

    if (
      typeof status === 'number' &&
      status >= 400 &&
      status < 500 &&
      httpLike?.expose === true
    ) {
      return this.build(
        status,
        typeof httpLike.message === 'string' ? httpLike.message : undefined,
      );
    }

    return this.build(HttpStatus.INTERNAL_SERVER_ERROR, INTERNAL_MESSAGE);
  }

  private fromHttpException(exception: HttpException): ApiErrorBody {
    const status = exception.getStatus();
    const raw = exception.getResponse();

    if (typeof raw === 'string') {
      return this.build(status, raw);
    }

    const payload = raw as {
      message?: string | string[];
      error?: string;
      code?: string;
    };

    return this.build(
      status,
      payload.message ?? exception.message,
      payload.code,
      payload.error,
    );
  }

  private build(
    statusCode: number,
    message?: string | string[],
    code?: string,
    error?: string,
  ): ApiErrorBody {
    const resolvedCode = code ?? codeForStatus(statusCode);

    return {
      statusCode,
      message:
        statusCode >= 500 && !code
          ? INTERNAL_MESSAGE
          : (message ?? statusName(statusCode)),
      error: error ?? statusName(statusCode),
      ...(resolvedCode ? { code: resolvedCode } : {}),
    };
  }
}
