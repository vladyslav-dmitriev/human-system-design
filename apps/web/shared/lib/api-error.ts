/**
 * Ошибки Nest API: тело `{ statusCode, message, error, code }`.
 * Код переводится в ключ `common.errors.<CODE>`; неизвестный код → `INTERNAL`.
 * Список кодов совпадает с `apps/api/src/common/errors/error-code.ts`.
 */
export const API_ERROR_CODES = [
  "AUTH_INVALID_CREDENTIALS",
  "AUTH_EMAIL_TAKEN",
  "AUTH_INVALID_OTP",
  "AUTH_TICKET_INVALID",
  "USER_INVALID_PASSWORD",
  "USER_EMAIL_TAKEN",
  "USER_INVALID_OTP",
  "EMAIL_TOKEN_INVALID",
  "UNAUTHORIZED",
  "CONFLICT",
  "PAYLOAD_TOO_LARGE",
  "VALIDATION_FAILED",
  "RATE_LIMITED",
  "NOT_FOUND",
  "FORBIDDEN",
  "INTERNAL",
] as const;

export type ApiErrorCode = (typeof API_ERROR_CODES)[number];

const isApiErrorCode = (value: unknown): value is ApiErrorCode =>
  typeof value === "string" &&
  (API_ERROR_CODES as readonly string[]).includes(value);

/** Код ошибки из ответа API; тело может быть пустым или не JSON */
export const getApiErrorCode = async (
  response: Response,
): Promise<ApiErrorCode> => {
  if (response.status === 429) return "RATE_LIMITED";
  try {
    const body: unknown = await response.json();
    if (body && typeof body === "object" && "code" in body) {
      const { code } = body;
      if (isApiErrorCode(code)) return code;
    }
  } catch {
    // тело не JSON
  }
  if (response.status === 401) return "UNAUTHORIZED";
  if (response.status === 403) return "FORBIDDEN";
  if (response.status === 409) return "CONFLICT";
  if (response.status === 413) return "PAYLOAD_TOO_LARGE";
  if (response.status === 404) return "NOT_FOUND";
  return "INTERNAL";
};

/** Ключ i18n для `useTranslations("common")` */
export const apiErrorKey = (code: ApiErrorCode) => `errors.${code}` as const;
