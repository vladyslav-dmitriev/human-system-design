import { apiErrorKey, type ApiErrorCode } from "@/shared/lib/api-error";

/** Ошибка шага входа или регистрации с ключом i18n (корень сообщений) */
export class AuthFlowError extends Error {
  constructor(public readonly key: string) {
    super(key);
    this.name = "AuthFlowError";
  }
}

export const fromApiCode = (code: ApiErrorCode) =>
  new AuthFlowError(apiErrorKey(code));

/** Не загрузился или отклонён reCAPTCHA */
export const captchaFailed = () => new AuthFlowError("captcha_failed");

/** Ключ i18n для показа пользователю; неизвестное → общая ошибка */
export const getAuthErrorKey = (error: unknown) =>
  error instanceof AuthFlowError ? error.key : apiErrorKey("INTERNAL");
