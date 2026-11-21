import { z } from "zod";

/**
 * Схемы форм входа, регистрации и профиля. `message` у каждой проверки это
 * ключ i18n (плоский корень сообщений), переводится в компоненте через `t()`.
 * Границы пароля совпадают с API: 8..72 байта UTF-8 (bcrypt обрезает всё, что длиннее).
 */
export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_BYTES = 72;
export const NAME_MAX_LENGTH = 100;

const byteLength = (value: string) => new TextEncoder().encode(value).length;

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(1, "email_error_empty")
  .pipe(z.email("email_error_invalid"));

export const newPasswordSchema = z
  .string()
  .min(1, "password_enter_new")
  .min(PASSWORD_MIN_LENGTH, "password_min_length")
  .refine((value) => byteLength(value) <= PASSWORD_MAX_BYTES, {
    message: "password_max_length",
  });

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "password_required"),
});

export const createAccountSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "name_required")
    .max(NAME_MAX_LENGTH, "name_too_long"),
  email: emailSchema,
  password: newPasswordSchema,
});

/** Первая ошибка по каждому полю: `{ email: "email_error_invalid" }` */
export const getFieldErrors = (error: z.ZodError) => {
  const errors: Record<string, string> = {};

  for (const issue of error.issues) {
    const field = String(issue.path[0] ?? "");
    if (field && !(field in errors)) errors[field] = issue.message;
  }

  return errors;
};

/** Для `register(..., { validate })` в react-hook-form: ключ ошибки или `true` */
export const validateWith =
  (schema: z.ZodType) =>
  (value: unknown): string | true => {
    const result = schema.safeParse(value);
    return result.success ? true : (result.error.issues[0]?.message ?? true);
  };
