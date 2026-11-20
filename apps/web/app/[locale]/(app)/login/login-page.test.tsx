import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

const { signIn, push, refresh, track, executeRecaptcha } = vi.hoisted(() => ({
  signIn: vi.fn(),
  push: vi.fn(),
  refresh: vi.fn(),
  track: vi.fn(),
  executeRecaptcha: vi.fn(),
}));

vi.mock("next-auth/react", () => ({ signIn }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push, refresh }) }));
vi.mock("@amplitude/analytics-browser", () => ({ track }));
vi.mock("@/providers/google-captcha-provider", () => ({ executeRecaptcha }));
vi.mock("next-intl", () => ({
  useTranslations: () => Object.assign((k: string) => k, { has: () => false }),
}));
// OTP-шаг (input-otp + Turnstile) в jsdom не нужен: подменяем границу
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
const json = (body: unknown, ok = true) =>
  Promise.resolve({ ok, json: () => Promise.resolve(body) });

const fillAndSubmit = (email = "user@example.com", password = "password123") => {
  fireEvent.change(screen.getByTestId("email-input"), { target: { value: email } });
  fireEvent.change(screen.getByTestId("password-input"), { target: { value: password } });
  fireEvent.click(screen.getByTestId("login-button"));
};

describe("LoginPage", () => {
  beforeEach(() => {
    [signIn, push, refresh, track, executeRecaptcha, fetchMock].forEach((m) => m.mockReset());
    executeRecaptcha.mockResolvedValue("captcha");
    signIn.mockResolvedValue({ error: null });
    vi.stubGlobal("fetch", fetchMock);
    vi.spyOn(console, "error").mockImplementation(() => {});
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("успешный вход без 2FA: login API -> signIn(credentials) -> /dashboard", async () => {
    fetchMock.mockReturnValue(json({ twoFactorEnabled: false }));
    render(<LoginPage />);
    fillAndSubmit();

    await waitFor(() => expect(push).toHaveBeenCalledWith("/dashboard"));
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toMatch(/\/service-auth\/login$/);
    expect(JSON.parse(init.body)).toEqual({
      email: "user@example.com",
      password: "password123",
      captchaToken: "captcha",
    });
    expect(signIn).toHaveBeenCalledWith("credentials", {
      email: "user@example.com",
      password: "password123",
      redirect: false,
    });
    expect(track).toHaveBeenCalledWith("User Signed In", { sign_in_method: "credentials" });
    expect(refresh).toHaveBeenCalled();
  });

  it("2FA включена: показывается OTP-шаг с телефоном, signIn ещё не вызван", async () => {
    fetchMock.mockReturnValue(json({ twoFactorEnabled: true, phone: "+380501112233" }));
    render(<LoginPage />);
    fillAndSubmit();
    expect(await screen.findByTestId("otp-phone")).toHaveTextContent("+380501112233");
    expect(signIn).not.toHaveBeenCalled();
    expect(push).not.toHaveBeenCalled();
  });

  it("signIn вернул error: показывается invalid_credentials, редиректа нет, форма разблокирована", async () => {
    fetchMock.mockReturnValue(json({ twoFactorEnabled: false }));
    signIn.mockResolvedValue({ error: "CredentialsSignin" });
    render(<LoginPage />);
    fillAndSubmit();
    expect(await screen.findByText("invalid_credentials")).toBeInTheDocument();
    expect(push).not.toHaveBeenCalled();
    expect(screen.getByTestId("login-button")).toBeEnabled();
  });

  it("кнопки Google и GitHub вызывают signIn с провайдером", () => {
    render(<LoginPage />);
    fireEvent.click(screen.getByRole("button", { name: /Google/ }));
    fireEvent.click(screen.getByRole("button", { name: /GitHub/ }));
    expect(signIn).toHaveBeenCalledWith("google");
    expect(signIn).toHaveBeenCalledWith("github");
  });

  // BUG: см. FIX.md "Login: ошибка API проглатывается, форма зависает"
  it.fails("401 от API: пользователь видит ошибку и кнопка разблокируется", async () => {
    fetchMock.mockReturnValue(json({ message: "Invalid credentials" }, false));
    render(<LoginPage />);
    fillAndSubmit();
    await waitFor(() => expect(screen.getByTestId("login-button")).toBeEnabled(), {
      timeout: 500,
    });
    expect(signIn).not.toHaveBeenCalled();
  });

  // BUG: см. FIX.md "Login: ошибка API проглатывается, форма зависает" (reCAPTCHA)
  it.fails("ошибка reCAPTCHA: форма разблокируется", async () => {
    executeRecaptcha.mockRejectedValue(new Error("reCAPTCHA script is not loaded"));
    render(<LoginPage />);
    fillAndSubmit();
    await waitFor(() => expect(screen.getByTestId("login-button")).toBeEnabled(), {
      timeout: 500,
    });
  });

  // BUG: см. FIX.md "Login: signIn вызывается дважды после OTP"
  it.fails("после проверки OTP signIn вызывается один раз", async () => {
    fetchMock
      .mockReturnValueOnce(json({ twoFactorEnabled: true, phone: "+380501112233" }))
      .mockReturnValueOnce(json({}));
    render(<LoginPage />);
    fillAndSubmit();
    fireEvent.click(await screen.findByText("verify-stub"));
    await waitFor(() => expect(push).toHaveBeenCalled());
    expect(signIn).toHaveBeenCalledTimes(1);
  });

  // BUG: см. FIX.md "Login: неверный OTP не показывает ошибку"
  it.fails("неверный OTP: показывается ошибка и signIn не вызывается", async () => {
    fetchMock
      .mockReturnValueOnce(json({ twoFactorEnabled: true, phone: "+380501112233" }))
      .mockReturnValueOnce(json({ message: "Invalid code" }, false));
    render(<LoginPage />);
    fillAndSubmit();
    fireEvent.click(await screen.findByText("verify-stub"));
    await waitFor(() => expect(screen.getByRole("alert")).toBeInTheDocument(), { timeout: 500 });
    expect(signIn).not.toHaveBeenCalled();
  });
});
