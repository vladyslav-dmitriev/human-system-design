import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

const { signIn, replace, refresh, track, executeRecaptcha } = vi.hoisted(() => ({
  signIn: vi.fn(),
  replace: vi.fn(),
  refresh: vi.fn(),
  track: vi.fn(),
  executeRecaptcha: vi.fn(),
}));

vi.mock("next-auth/react", () => ({ signIn }));
// локализованная навигация: настоящий createNavigation тянет next/navigation, которого нет в vitest
vi.mock("@/i18n/navigation", () => ({
  useRouter: () => ({ replace, refresh, push: vi.fn() }),
  Link: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));
vi.mock("@amplitude/analytics-browser", () => ({ track }));
vi.mock("@/providers/google-captcha-provider", () => ({ executeRecaptcha }));
vi.mock("next-intl", () => ({
  useTranslations: () => Object.assign((k: string) => k, { has: () => false }),
}));
// OTP-шаг (input-otp) в jsdom не нужен: подменяем границу
vi.mock("./login-auth-otp-step", () => ({
  LoginAuthOtpStep: ({
    phone,
    onVerify,
    error,
  }: {
    phone: string;
    onVerify: (c: string) => void;
    error: string | null;
  }) => (
    <div>
      <span data-testid="otp-phone">{phone}</span>
      {error && <span role="alert">{error}</span>}
      <button onClick={() => onVerify("123456")}>verify-stub</button>
    </div>
  ),
}));

import LoginPage from "./page";

const fetchMock = vi.fn();
const json = (body: unknown, ok = true, status = ok ? 200 : 400) =>
  Promise.resolve({ ok, status, json: () => Promise.resolve(body) });

const fillAndSubmit = (email = "user@example.com", password = "password123") => {
  fireEvent.change(screen.getByTestId("email-input"), { target: { value: email } });
  fireEvent.change(screen.getByTestId("password-input"), { target: { value: password } });
  fireEvent.click(screen.getByTestId("login-button"));
};

const TICKET = "t".repeat(43);

describe("LoginPage", () => {
  beforeEach(() => {
    [signIn, replace, refresh, track, executeRecaptcha, fetchMock].forEach((m) => m.mockReset());
    executeRecaptcha.mockResolvedValue("captcha");
    signIn.mockResolvedValue({ error: null });
    vi.stubGlobal("fetch", fetchMock);
    vi.spyOn(console, "error").mockImplementation(() => {});
    window.history.pushState({}, "", "/login");
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("вход без 2FA: login API -> signIn(credentials) ТОЛЬКО с loginTicket -> переход на /dashboard", async () => {
    fetchMock.mockReturnValue(json({ twoFactorRequired: false, loginTicket: TICKET }));
    render(<LoginPage />);
    fillAndSubmit("  User@Example.com ", "password123");

    await waitFor(() => expect(replace).toHaveBeenCalledWith("/dashboard"));
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toMatch(/\/service-auth\/login$/);
    expect(JSON.parse(init.body)).toEqual({
      email: "user@example.com",
      password: "password123",
      captchaToken: "captcha",
    });
    // пароль второй раз не отправляется: только билет
    expect(signIn).toHaveBeenCalledTimes(1);
    expect(signIn).toHaveBeenCalledWith("credentials", {
      loginTicket: TICKET,
      redirect: false,
    });
    expect(track).toHaveBeenCalledWith("User Signed In", { sign_in_method: "credentials" });
    expect(refresh).toHaveBeenCalled();
  });

  it.each([
    ["/settings", "/settings"],
    ["/settings?tab=security", "/settings?tab=security"],
    ["/uk/billing", "/billing"],
    ["//evil.example", "/dashboard"],
    ["https://evil.example", "/dashboard"],
    ["/\\evil.example", "/dashboard"],
    ["/login", "/dashboard"],
  ])("callbackUrl=%s после входа ведёт на %s (open redirect закрыт)", async (callback, expected) => {
    window.history.pushState({}, "", `/login?callbackUrl=${encodeURIComponent(callback)}`);
    fetchMock.mockReturnValue(json({ twoFactorRequired: false, loginTicket: TICKET }));
    render(<LoginPage />);
    fillAndSubmit();
    await waitFor(() => expect(replace).toHaveBeenCalledWith(expected));
  });

  it("2FA: показывается OTP-шаг с замаскированным телефоном, signIn ещё не вызван", async () => {
    fetchMock.mockReturnValue(json({ twoFactorRequired: true, phoneMasked: "**********33" }));
    render(<LoginPage />);
    fillAndSubmit();
    expect(await screen.findByTestId("otp-phone")).toHaveTextContent("**********33");
    expect(signIn).not.toHaveBeenCalled();
    expect(replace).not.toHaveBeenCalled();
  });

  it("2FA: verify-otp получает только email и code (без пароля и captcha), затем ровно один signIn с билетом", async () => {
    fetchMock
      .mockReturnValueOnce(json({ twoFactorRequired: true, phoneMasked: "**********33" }))
      .mockReturnValueOnce(json({ loginTicket: TICKET }));
    render(<LoginPage />);
    fillAndSubmit("user@example.com", "password123");
    fireEvent.click(await screen.findByText("verify-stub"));

    await waitFor(() => expect(replace).toHaveBeenCalledWith("/dashboard"));
    const [url, init] = fetchMock.mock.calls[1]!;
    expect(url).toMatch(/\/service-auth\/verify-otp$/);
    expect(JSON.parse(init.body)).toEqual({ email: "user@example.com", code: "123456" });
    expect(signIn).toHaveBeenCalledTimes(1);
    expect(signIn).toHaveBeenCalledWith("credentials", { loginTicket: TICKET, redirect: false });
  });

  it("неверный OTP (400 AUTH_INVALID_OTP): показывается ошибка, signIn не вызывается", async () => {
    fetchMock
      .mockReturnValueOnce(json({ twoFactorRequired: true, phoneMasked: "**********33" }))
      .mockReturnValueOnce(json({ code: "AUTH_INVALID_OTP", message: "x" }, false, 400));
    render(<LoginPage />);
    fillAndSubmit();
    fireEvent.click(await screen.findByText("verify-stub"));
    expect(await screen.findByRole("alert")).toHaveTextContent("errors.AUTH_INVALID_OTP");
    expect(signIn).not.toHaveBeenCalled();
    expect(replace).not.toHaveBeenCalled();
  });

  it("401 AUTH_INVALID_CREDENTIALS: пользователь видит ошибку, кнопка разблокируется, signIn не вызывается", async () => {
    fetchMock.mockReturnValue(
      json({ code: "AUTH_INVALID_CREDENTIALS", message: "x" }, false, 401),
    );
    render(<LoginPage />);
    fillAndSubmit();
    expect(await screen.findByText("errors.AUTH_INVALID_CREDENTIALS")).toBeInTheDocument();
    expect(screen.getByTestId("login-button")).toBeEnabled();
    expect(signIn).not.toHaveBeenCalled();
    expect(replace).not.toHaveBeenCalled();
  });

  it("429: показывается RATE_LIMITED", async () => {
    fetchMock.mockReturnValue(json({ statusCode: 429 }, false, 429));
    render(<LoginPage />);
    fillAndSubmit();
    expect(await screen.findByText("errors.RATE_LIMITED")).toBeInTheDocument();
  });

  it("сетевая ошибка: общая ошибка, форма разблокируется", async () => {
    fetchMock.mockRejectedValue(new Error("offline"));
    render(<LoginPage />);
    fillAndSubmit();
    expect(await screen.findByText("errors.INTERNAL")).toBeInTheDocument();
    expect(screen.getByTestId("login-button")).toBeEnabled();
  });

  it("ошибка reCAPTCHA: сообщение captcha_failed, запрос на сервер не уходит, форма разблокируется", async () => {
    executeRecaptcha.mockRejectedValue(new Error("reCAPTCHA script is not loaded"));
    render(<LoginPage />);
    fillAndSubmit();
    expect(await screen.findByText("captcha_failed")).toBeInTheDocument();
    expect(screen.getByTestId("login-button")).toBeEnabled();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("signIn отклонил билет: ошибка AUTH_TICKET_INVALID, редиректа нет, форма разблокирована", async () => {
    fetchMock.mockReturnValue(json({ twoFactorRequired: false, loginTicket: TICKET }));
    signIn.mockResolvedValue({ error: "CredentialsSignin" });
    render(<LoginPage />);
    fillAndSubmit();
    expect(await screen.findByText("errors.AUTH_TICKET_INVALID")).toBeInTheDocument();
    expect(replace).not.toHaveBeenCalled();
    expect(screen.getByTestId("login-button")).toBeEnabled();
  });

  it("ответ 200 без loginTicket не приводит к входу", async () => {
    fetchMock.mockReturnValue(json({ twoFactorRequired: false }));
    render(<LoginPage />);
    fillAndSubmit();
    expect(await screen.findByText("errors.AUTH_TICKET_INVALID")).toBeInTheDocument();
    expect(signIn).not.toHaveBeenCalled();
  });

  it("пустые поля: ошибки у полей (i18n-ключи), запрос не уходит", async () => {
    render(<LoginPage />);
    fillAndSubmit("", "");
    expect(await screen.findByText("email_error_empty")).toBeInTheDocument();
    expect(screen.getByText("password_required")).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
    expect(executeRecaptcha).not.toHaveBeenCalled();
  });

  it("невалидный email: email_error_invalid, запрос не уходит", async () => {
    render(<LoginPage />);
    fillAndSubmit("not-an-email", "password123");
    expect(await screen.findByText("email_error_invalid")).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("forgot-password и OAuth скрыты: нет ссылки «забыли пароль» и кнопок Google/GitHub", () => {
    render(<LoginPage />);
    expect(screen.queryByText(/forgot/i)).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Google|GitHub/i })).not.toBeInTheDocument();
    for (const link of screen.queryAllByRole("link")) {
      expect(link.getAttribute("href")).not.toMatch(/forgot-password/);
    }
    // единственная ссылка на странице входа: регистрация
    expect(
      screen.getByRole("link", { name: "createAccount" }).getAttribute("href"),
    ).toBe("/create-account");
  });

  it("повторная отправка блокируется, пока запрос в полёте", async () => {
    let resolve!: (v: unknown) => void;
    fetchMock.mockReturnValue(new Promise((r) => (resolve = r)));
    render(<LoginPage />);
    fillAndSubmit();
    await waitFor(() => expect(screen.getByTestId("login-button")).toBeDisabled());
    fireEvent.click(screen.getByTestId("login-button"));
    expect(fetchMock).toHaveBeenCalledTimes(1);
    resolve({ ok: true, status: 200, json: () => Promise.resolve({ twoFactorRequired: false, loginTicket: TICKET }) });
    await waitFor(() => expect(replace).toHaveBeenCalled());
  });
});
