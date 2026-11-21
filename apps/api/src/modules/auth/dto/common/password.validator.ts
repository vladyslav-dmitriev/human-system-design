import { applyDecorators } from '@nestjs/common';
import { IsString, MinLength, ValidateBy } from 'class-validator';

export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_BYTES = 72;

/** bcrypt молча обрезает пароль до 72 байт, поэтому верхняя граница считается в байтах UTF-8. */
export const IsPasswordMaxBytes = () =>
  ValidateBy({
    name: 'isPasswordMaxBytes',
    validator: {
      validate: (value: unknown) =>
        typeof value === 'string' &&
        Buffer.byteLength(value, 'utf8') <= PASSWORD_MAX_BYTES,
      defaultMessage: () =>
        `password must be at most ${PASSWORD_MAX_BYTES} bytes`,
    },
  });

/** Новый пароль: от 8 символов до 72 байт (UTF-8). */
export const IsNewPassword = () =>
  applyDecorators(
    IsString(),
    MinLength(PASSWORD_MIN_LENGTH),
    IsPasswordMaxBytes(),
  );
