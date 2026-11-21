import { describe, expect, it } from "vitest";
import {
  createAccountSchema,
  emailSchema,
  getFieldErrors,
  loginSchema,
  newPasswordSchema,
  validateWith,
} from "./auth-schemas";

const messages = (schema: { safeParse: (v: unknown) => any }, value: unknown) =>
  schema
    .safeParse(value)
    .error?.issues.map((i: { message: string }) => i.message) ?? [];

describe("emailSchema", () => {
  it("тримит и приводит к нижнему регистру (как API)", () => {
    expect(emailSchema.parse("  User@Example.COM ")).toBe("user@example.com");
  });
  it("пустой и из пробелов: email_error_empty", () => {
    expect(messages(emailSchema, "")).toContain("email_error_empty");
    expect(messages(emailSchema, "   ")).toContain("email_error_empty");
  });
  it.each(["abc", "a@b", "@x.com", "a b@x.com"])(
    "невалидный %s: email_error_invalid",
    (v) => {
      expect(messages(emailSchema, v)).toContain("email_error_invalid");
    },
  );
});

describe("newPasswordSchema (8..72 байта, как API)", () => {
  const ok = (v: string) => newPasswordSchema.safeParse(v).success;

  it("границы по длине: 7 нет, 8 да", () => {
    expect(ok("a".repeat(7))).toBe(false);
    expect(messages(newPasswordSchema, "a".repeat(7))).toContain(
      "password_min_length",
    );
    expect(ok("a".repeat(8))).toBe(true);
  });
  it("граница сверху в БАЙТАХ: 72 да, 73 нет", () => {
    expect(ok("a".repeat(72))).toBe(true);
    expect(ok("a".repeat(73))).toBe(false);
    expect(messages(newPasswordSchema, "a".repeat(73))).toContain(
      "password_max_length",
    );
  });
  it("многобайтные символы: 36 x 2 байта = 72 да, 37 x 2 = 74 нет", () => {
    expect(ok("é".repeat(36))).toBe(true);
    expect(ok("é".repeat(37))).toBe(false);
  });
  it("эмодзи (4 байта): 18 штук = 72 да, 19 = 76 нет", () => {
    expect(ok("😀".repeat(18))).toBe(true);
    expect(ok("😀".repeat(19))).toBe(false);
  });
  it("пустой: password_enter_new", () => {
    expect(messages(newPasswordSchema, "")).toContain("password_enter_new");
  });
  it("пароль не тримится: пробелы по краям считаются символами", () => {
    expect(ok("        ")).toBe(true);
  });
});

describe("loginSchema", () => {
  it("принимает валидные данные и нормализует email", () => {
    expect(loginSchema.parse({ email: " A@B.io ", password: "x" })).toEqual({
      email: "a@b.io",
      password: "x",
    });
  });
  it("вход не навязывает политику пароля (старые аккаунты): 1 символ допустим, пустой нет", () => {
    expect(
      loginSchema.safeParse({ email: "a@b.io", password: "x" }).success,
    ).toBe(true);
    expect(messages(loginSchema, { email: "a@b.io", password: "" })).toContain(
      "password_required",
    );
  });
});

describe("createAccountSchema", () => {
  const valid = { name: "Ann", email: "a@b.io", password: "password1" };

  it("валидные данные проходят", () => {
    expect(createAccountSchema.safeParse(valid).success).toBe(true);
  });
  it("имя: trim, не пустое, до 100", () => {
    expect(createAccountSchema.parse({ ...valid, name: "  Ann " }).name).toBe(
      "Ann",
    );
    expect(messages(createAccountSchema, { ...valid, name: "   " })).toContain(
      "name_required",
    );
    expect(
      createAccountSchema.safeParse({ ...valid, name: "x".repeat(100) })
        .success,
    ).toBe(true);
    expect(
      messages(createAccountSchema, { ...valid, name: "x".repeat(101) }),
    ).toContain("name_too_long");
  });
  it("пароль 1 символ отклоняется", () => {
    expect(
      messages(createAccountSchema, { ...valid, password: "a" }),
    ).toContain("password_min_length");
  });
});

describe("getFieldErrors / validateWith", () => {
  it("первая ошибка по каждому полю", () => {
    const r = createAccountSchema.safeParse({
      name: "",
      email: "bad",
      password: "a",
    });
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(getFieldErrors(r.error)).toEqual({
        name: "name_required",
        email: "email_error_invalid",
        password: "password_min_length",
      });
    }
  });
  it("validateWith: true для валидного, ключ для невалидного", () => {
    expect(validateWith(emailSchema)("a@b.io")).toBe(true);
    expect(validateWith(emailSchema)("nope")).toBe("email_error_invalid");
  });
});
