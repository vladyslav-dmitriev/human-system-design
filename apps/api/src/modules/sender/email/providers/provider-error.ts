import { InternalServerErrorException } from '@nestjs/common';

const EMAIL_PATTERN = /[^\s@<>"',;]+@[^\s@<>"',;]+/g;
const MAX_REASON_LENGTH = 300;

type ProviderErrorInfo = {
  /** Код или имя ошибки провайдера, например `validation_error` или `ECONNRESET` */
  code?: string | number;
  /** HTTP-статус ответа провайдера */
  status?: number | null;
  message?: string;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

/** Причина должна попасть в лог, но не адреса получателей (ПДн) и не бесконечный текст. */
const sanitize = (text: string): string =>
  text.replace(EMAIL_PATTERN, '<email>').slice(0, MAX_REASON_LENGTH);

/**
 * Достаёт из ошибки SDK провайдера только безопасные поля: код, статус, сообщение.
 * Ключи API и тело запроса (адрес, токен в ссылке) не читаем и не логируем.
 * Поддержаны формы Resend (`{ name, statusCode, message }`),
 * SendGrid (`{ code, response.body.errors[].message }`) и обычный `Error`.
 */
export function extractProviderError(error: unknown): ProviderErrorInfo {
  if (!isRecord(error)) {
    return { message: typeof error === 'string' ? error : undefined };
  }

  const info: ProviderErrorInfo = {};

  if (typeof error.name === 'string' && error.name !== 'Error') {
    info.code = error.name;
  } else if (typeof error.code === 'string' || typeof error.code === 'number') {
    info.code = error.code;
  }

  if (typeof error.statusCode === 'number') {
    info.status = error.statusCode;
  } else if (typeof error.code === 'number') {
    info.status = error.code;
  }

  const sendGridErrors = isRecord(error.response)
    ? (error.response.body as { errors?: unknown } | undefined)?.errors
    : undefined;

  if (Array.isArray(sendGridErrors) && sendGridErrors.length > 0) {
    info.message = sendGridErrors
      .map((item) =>
        isRecord(item) && typeof item.message === 'string' ? item.message : '',
      )
      .filter(Boolean)
      .join('; ');
  }

  if (!info.message && typeof error.message === 'string') {
    info.message = error.message;
  }

  return info;
}

export function formatProviderError(provider: string, error: unknown): string {
  const { code, status, message } = extractProviderError(error);

  const parts = [
    `Error sending email via ${provider}`,
    code !== undefined || status != null
      ? ` [${[code, status].filter((v) => v !== undefined && v !== null).join(' ')}]`
      : '',
    message ? `: ${sanitize(message)}` : '',
  ];

  return parts.join('');
}

/** Сообщение попадает в лог процессора и в failedReason задачи BullMQ; исходная ошибка остаётся в `cause`. */
export function emailSendFailed(
  provider: string,
  error: unknown,
): InternalServerErrorException {
  return new InternalServerErrorException(
    formatProviderError(provider, error),
    {
      cause: error,
    },
  );
}
