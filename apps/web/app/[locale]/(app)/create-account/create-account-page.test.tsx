import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

const { signIn, replace, refresh, executeRecaptcha } = vi.hoisted(() => ({
  signIn: vi.fn(),
  replace: vi.fn(),
  refresh: vi.fn(),
  executeRecaptcha: vi.fn(),
}));

vi.mock("next-auth/react", () => ({ signIn }));
vi.mock("@/i18n/navigation", () => ({
  useRouter: () => ({ replace, refresh, push: vi.fn() }),
  Link: ({
    href,
    children,
    ...rest
  }: {
    href: string;
    children: React.ReactNode;
  }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));
vi.mock("@/providers/google-captcha-provider", () => ({ executeRecaptcha }));
vi.mock("next-intl", () => ({
  useTranslations: () => Object.assign((k: string) => k, { has: () => false }),
  useLocale: () => "uk",
}));

import CreateAccountPage from "./page";

const fetchMock = vi.fn();
const json = (body: unknown, ok = true, status = ok ? 200 : 400) =>
  Promise.resolve({ ok, status, json: () => Promise.resolve(body) });

const TICKET = "t".repeat(43);

const fill = (name: string, email: string, password: string) => {
  fireEvent.change(screen.getByTestId("name-input"), {
    target: { value: name },
  });
  fireEvent.change(screen.getByTestId("email-input"), {
    target: { value: email },
  });
  fireEvent.change(screen.getByTestId("password-input"), {
    target: { value: password },
  });
  fireEvent.click(screen.getByTestId("create-account-button"));
};

describe("CreateAccountPage", () => {
  beforeEach(() => {
    [signIn, replace, refresh, executeRecaptcha, fetchMock].forEach((m) =>
      m.mockReset(),
    );
    executeRecaptcha.mockResolvedValue("captcha");
    signIn.mockResolvedValue({ error: null });
    vi.stubGlobal("fetch", fetchMock);
    vi.spyOn(console, "error").mockImplementation(() => {});
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("успех: register (email нормализован, locale из next-intl) -> login -> signIn(loginTicket) -> /dashboard", async () => {
    fetchMock
      .mockReturnValueOnce(json({ success: true }, true, 201))
      .mockReturnValueOnce(
        json({ twoFactorRequired: false, loginTicket: TICKET }),
      );
    render(<CreateAccountPage />);
    fill("  Ann ", " Ann@Example.COM ", "password123");

    await waitFor(() => expect(replace).toHaveBeenCalledWith("/dashboard"));
    const [regUrl, regInit] = fetchMock.mock.calls[0]!;
    expect(regUrl).toMatch(/\/service-auth\/register$/);
    expect(JSON.parse(regInit.body)).toEqual({
      name: "Ann",
      email: "ann@example.com",
      password: "password123",
      locale: "uk",
      captchaToken: "captcha",
    });
    expect(fetchMock.mock.calls[1]![0]).toMatch(/\/service-auth\/login$/);
    expect(signIn).toHaveBeenCalledTimes(1);
    expect(signIn).toHaveBeenCalledWith("credentials", {
      loginTicket: TICKET,
      redirect: false,
    });
  });

  it("409 AUTH_EMAIL_TAKEN: понятная ошибка, форма разблокируется, вход не выполняется", async () => {
    fetchMock.mockReturnValue(json({ code: "AUTH_EMAIL_TAKEN" }, false, 409));
    render(<CreateAccountPage />);
    fill("Ann", "ann@example.com", "password123");

    expect(
      await screen.findByText("errors.AUTH_EMAIL_TAKEN"),
    ).toBeInTheDocument();
    expect(screen.getByTestId("create-account-button")).toBeEnabled();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(signIn).not.toHaveBeenCalled();
  });

  it("ошибка сервера (500): общая ошибка вместо вечного спиннера", async () => {
    fetchMock.mockReturnValue(json({ code: "INTERNAL" }, false, 500));
    render(<CreateAccountPage />);
    fill("Ann", "ann@example.com", "password123");

    expect(await screen.findByText("errors.INTERNAL")).toBeInTheDocument();
    expect(screen.getByTestId("create-account-button")).toBeEnabled();
  });

  it("ошибка reCAPTCHA: captcha_failed, запрос не уходит", async () => {
    executeRecaptcha.mockRejectedValue(new Error("not loaded"));
    render(<CreateAccountPage />);
    fill("Ann", "ann@example.com", "password123");

    expect(await screen.findByText("captcha_failed")).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
    expect(screen.getByTestId("create-account-button")).toBeEnabled();
  });

  it.each([
    ["пустое имя", "", "a@b.io", "password123", "name_required"],
    ["невалидный email", "Ann", "nope", "password123", "email_error_invalid"],
    ["пароль 1 символ", "Ann", "a@b.io", "a", "password_min_length"],
    ["пароль 7 символов", "Ann", "a@b.io", "1234567", "password_min_length"],
    ["пароль 73 байта", "Ann", "a@b.io", "a".repeat(73), "password_max_length"],
  ])(
    "%s: ошибка поля, запрос не уходит",
    async (_n, name, email, password, key) => {
      render(<CreateAccountPage />);
      fill(name, email, password);
      expect(await screen.findByText(key)).toBeInTheDocument();
      expect(fetchMock).not.toHaveBeenCalled();
    },
  );

  it("граница пароля 8 и 72 байта проходит клиентскую валидацию", async () => {
    fetchMock.mockReturnValue(json({ success: true }, false, 409));
    for (const password of ["12345678", "a".repeat(72)]) {
      fetchMock.mockClear();
      const { unmount } = render(<CreateAccountPage />);
      fill("Ann", "a@b.io", password);
      await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
      unmount();
    }
  });

  it("у нового пользователя вдруг включена 2FA: уходим на страницу входа без signIn", async () => {
    fetchMock
      .mockReturnValueOnce(json({ success: true }, true, 201))
      .mockReturnValueOnce(
        json({ twoFactorRequired: true, phoneMasked: "**" }),
      );
    render(<CreateAccountPage />);
    fill("Ann", "ann@example.com", "password123");
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/login"));
    expect(signIn).not.toHaveBeenCalled();
  });
});
