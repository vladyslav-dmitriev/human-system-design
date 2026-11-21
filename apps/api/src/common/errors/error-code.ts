/**
 * Коды ошибок API. Отдаются в поле `code` тела ошибки
 * `{ statusCode, message, error, code }`; web переводит код в текст через i18n
 * (`common.errors.<CODE>`). Новый код добавляйте и сюда, и в `apps/web/shared/lib/api-error.ts`.
 */
export const ErrorCode = {
  AUTH_INVALID_CREDENTIALS: 'AUTH_INVALID_CREDENTIALS',
  AUTH_EMAIL_TAKEN: 'AUTH_EMAIL_TAKEN',
  AUTH_INVALID_OTP: 'AUTH_INVALID_OTP',
  AUTH_TICKET_INVALID: 'AUTH_TICKET_INVALID',
  USER_INVALID_PASSWORD: 'USER_INVALID_PASSWORD',
  USER_EMAIL_TAKEN: 'USER_EMAIL_TAKEN',
  USER_INVALID_OTP: 'USER_INVALID_OTP',
  EMAIL_TOKEN_INVALID: 'EMAIL_TOKEN_INVALID',
  UNAUTHORIZED: 'UNAUTHORIZED',
  CONFLICT: 'CONFLICT',
  PAYLOAD_TOO_LARGE: 'PAYLOAD_TOO_LARGE',
  VALIDATION_FAILED: 'VALIDATION_FAILED',
  RATE_LIMITED: 'RATE_LIMITED',
  NOT_FOUND: 'NOT_FOUND',
  FORBIDDEN: 'FORBIDDEN',
  INTERNAL: 'INTERNAL',
} as const;

export type ErrorCode = (typeof ErrorCode)[keyof typeof ErrorCode];
