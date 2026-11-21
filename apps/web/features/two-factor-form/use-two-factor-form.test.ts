import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";

const { executeRecaptcha } = vi.hoisted(() => ({ executeRecaptcha: vi.fn() }));
vi.mock("@/providers/google-captcha-provider", () => ({ executeRecaptcha }));

import { useTwoFactorForm } from "./use-two-factor-form";

const fetchMock = vi.fn();
const res = (ok: boolean) => Promise.resolve({ ok, json: () => Promise.resolve({}) });

const setup = (input: { userPhone: string | null; userTwoFactorEnabled: boolean | null }) =>
  renderHook(() => useTwoFactorForm(input));

describe("useTwoFactorForm", () => {
  beforeEach(() => {
    fetchMock.mockReset();
    executeRecaptcha.mockReset();
    executeRecaptcha.mockResolvedValue("captcha-token");
    vi.stubGlobal("fetch", fetchMock);
    vi.spyOn(console, "error").mockImplementation(() => {});
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("начальное состояние берётся из пропсов (null -> выключено)", () => {
    const { result } = setup({ userPhone: null, userTwoFactorEnabled: null });
    expect(result.current.enabled).toBe(false);
    expect(result.current.phone).toBeNull();
    expect(result.current.step).toBe("idle");
    expect(result.current.loading).toBe(false);
  });

  it("включение: переход на шаг phone", async () => {
    const { result } = setup({ userPhone: null, userTwoFactorEnabled: false });
    await act(() => result.current.handleSwitchEnabled());
    expect(result.current.step).toBe("phone");
    expect(result.current.enabled).toBe(true);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("connectPhone без номера: запрос не отправляется", async () => {
    const { result } = setup({ userPhone: null, userTwoFactorEnabled: false });
    await act(() => result.current.handleConnectPhone());
    expect(fetchMock).not.toHaveBeenCalled();
    expect(result.current.step).toBe("idle");
  });

  it("connectPhone: отправляет SMS с captcha-токеном и переходит на otp", async () => {
    fetchMock.mockReturnValue(res(true));
    const { result } = setup({ userPhone: null, userTwoFactorEnabled: false });
    act(() => result.current.setPhone("+380501112233"));
    await act(() => result.current.handleConnectPhone());

    expect(executeRecaptcha).toHaveBeenCalledWith("twoFactor");
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toMatch(/\/sender\/sms\/send$/);
    expect(JSON.parse(init.body)).toEqual({
      phoneNumber: "+380501112233",
      captchaToken: "captcha-token",
    });
    expect(result.current.step).toBe("otp");
  });

  it("connectPhone: ответ не ok (например 429): остаёмся на шаге phone", async () => {
    fetchMock.mockReturnValue(res(false));
    const { result } = setup({ userPhone: null, userTwoFactorEnabled: false });
    await act(() => result.current.handleSwitchEnabled());
    act(() => result.current.setPhone("+380501112233"));
    await act(() => result.current.handleConnectPhone());
    expect(result.current.step).toBe("phone");
  });

  it("connectPhone: сетевая ошибка не роняет хук", async () => {
    fetchMock.mockRejectedValue(new Error("offline"));
    const { result } = setup({ userPhone: "+380501112233", userTwoFactorEnabled: false });
    await act(() => result.current.handleConnectPhone());
    expect(result.current.step).toBe("idle");
  });

  it("enterCode (включение): POST с phone/code/twoFactorEnabled=true, возврат в idle", async () => {
    fetchMock.mockReturnValue(res(true));
    const { result } = setup({ userPhone: null, userTwoFactorEnabled: false });
    act(() => {
      result.current.setPhone("+380501112233");
      result.current.setOtp("123456");
    });
    await act(() => result.current.handleEnterCode());

    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toMatch(/\/user\/profile\/2fa$/);
    expect(JSON.parse(init.body)).toEqual({
      phone: "+380501112233",
      code: "123456",
      twoFactorEnabled: true,
    });
    expect(result.current.enabled).toBe(true);
    expect(result.current.phone).toBe("+380501112233");
    expect(result.current.otp).toBe("");
    expect(result.current.step).toBe("idle");
  });

  it("выключение: SMS на сохранённый номер, затем enterCode сбрасывает телефон", async () => {
    fetchMock.mockReturnValue(res(true));
    const { result } = setup({ userPhone: "+380501112233", userTwoFactorEnabled: true });
    await act(() => result.current.handleSwitchEnabled());
    expect(result.current.step).toBe("otp");
    act(() => result.current.setOtp("654321"));
    await act(() => result.current.handleEnterCode());

    expect(JSON.parse(fetchMock.mock.calls[1]![1].body).twoFactorEnabled).toBe(false);
    expect(result.current.enabled).toBe(false);
    expect(result.current.phone).toBeNull();
    expect(result.current.loading).toBe(false);
  });

  // BUG: см. FIX.md "2FA: неверный код считается успешным"
  it.fails("enterCode: ответ не ok (неверный код) не меняет состояние 2FA", async () => {
    fetchMock.mockReturnValueOnce(res(true)).mockReturnValueOnce(res(false));
    const { result } = setup({ userPhone: null, userTwoFactorEnabled: false });
    act(() => {
      result.current.setPhone("+380501112233");
      result.current.setOtp("000000");
    });
    await act(() => result.current.handleConnectPhone());
    expect(result.current.step).toBe("otp");
    await act(() => result.current.handleEnterCode());
    // сервер отклонил код: остаёмся на шаге otp и код не сбрасываем
    expect(result.current.step).toBe("otp");
  });

  // BUG: см. FIX.md "2FA: loading зависает при ошибке отправки SMS"
  it.fails("выключение: если SMS не ушла, loading сбрасывается (Switch не пропадает)", async () => {
    fetchMock.mockReturnValue(res(false));
    const { result } = setup({ userPhone: "+380501112233", userTwoFactorEnabled: true });
    await act(() => result.current.handleSwitchEnabled());
    expect(result.current.loading).toBe(false);
  });

  // BUG: см. FIX.md "2FA: ошибка reCAPTCHA не обрабатывается"
  it.fails("sendSmsCode: ошибка reCAPTCHA не приводит к необработанному reject", async () => {
    executeRecaptcha.mockRejectedValue(new Error("reCAPTCHA script is not loaded"));
    const { result } = setup({ userPhone: "+380501112233", userTwoFactorEnabled: false });
    await act(async () => {
      await expect(result.current.handleConnectPhone()).resolves.toBeUndefined();
    });
  });
});
