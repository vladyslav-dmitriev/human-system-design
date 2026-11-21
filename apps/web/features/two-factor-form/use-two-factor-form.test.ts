import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";

const { expireSession } = vi.hoisted(() => ({ expireSession: vi.fn() }));
vi.mock("@/shared/lib/api-client", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/shared/lib/api-client")>()),
  expireSession,
}));

import { useTwoFactorForm } from "./use-two-factor-form";

const fetchMock = vi.fn();
const res = (ok: boolean, body: unknown = {}, status = ok ? 200 : 400) =>
  Promise.resolve({ ok, status, json: () => Promise.resolve(body) });
const ok = (body: unknown = { success: true }) => res(true, body);
const fail = (code: string, status = 400) => res(false, { code }, status);

const setup = (input: {
  userPhone: string | null;
  userTwoFactorEnabled: boolean | null;
}) => renderHook(() => useTwoFactorForm(input));

const callsTo = (re: RegExp) =>
  fetchMock.mock.calls.filter(([url]) => re.test(String(url)));

describe("useTwoFactorForm", () => {
  beforeEach(() => {
    fetchMock.mockReset();
    expireSession.mockReset();
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
    expect(result.current.error).toBeNull();
  });

  it("включение: переход на шаг phone без запросов", async () => {
    const { result } = setup({ userPhone: null, userTwoFactorEnabled: false });
    await act(() => result.current.handleSwitchEnabled());
    expect(result.current.step).toBe("phone");
    expect(result.current.enabled).toBe(true);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("повторный клик по Switch до подтверждения: откат, ничего не сохранено", async () => {
    const { result } = setup({ userPhone: null, userTwoFactorEnabled: false });
    await act(() => result.current.handleSwitchEnabled());
    await act(() => result.current.handleSwitchEnabled());
    expect(result.current.enabled).toBe(false);
    expect(result.current.step).toBe("idle");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("connectPhone без номера: запрос не отправляется", async () => {
    const { result } = setup({ userPhone: null, userTwoFactorEnabled: false });
    await act(() => result.current.handleConnectPhone());
    expect(fetchMock).not.toHaveBeenCalled();
    expect(result.current.step).toBe("idle");
  });

  it("connectPhone: PUT номера в профиль, затем POST /sender/sms/send с ПУСТЫМ телом (номер и captcha не отправляются), шаг otp", async () => {
    fetchMock.mockReturnValue(ok());
    const { result } = setup({ userPhone: null, userTwoFactorEnabled: false });
    act(() => result.current.setPhone("+380501112233"));
    await act(() => result.current.handleConnectPhone());

    expect(fetchMock).toHaveBeenCalledTimes(2);
    const [putUrl, putInit] = fetchMock.mock.calls[0]!;
    expect(putUrl).toMatch(/\/user\/profile\/phone$/);
    expect(putInit.method).toBe("PUT");
    expect(JSON.parse(putInit.body)).toEqual({ phone: "+380501112233" });

    const [smsUrl, smsInit] = fetchMock.mock.calls[1]!;
    expect(smsUrl).toMatch(/\/sender\/sms\/send$/);
    expect(smsInit.method).toBe("POST");
    expect(smsInit.credentials).toBe("include");
    expect(JSON.parse(smsInit.body)).toEqual({});
    expect(result.current.step).toBe("otp");
    expect(result.current.error).toBeNull();
  });

  it("connectPhone: PUT не прошёл (400) -> SMS не отправляется, остаёмся на phone, ошибка по коду", async () => {
    fetchMock.mockReturnValue(fail("VALIDATION_FAILED"));
    const { result } = setup({ userPhone: null, userTwoFactorEnabled: false });
    await act(() => result.current.handleSwitchEnabled());
    act(() => result.current.setPhone("bad"));
    await act(() => result.current.handleConnectPhone());
    expect(callsTo(/sender\/sms/)).toHaveLength(0);
    expect(result.current.step).toBe("phone");
    expect(result.current.error).toBe("errors.VALIDATION_FAILED");
    expect(result.current.loading).toBe(false);
  });

  it("connectPhone: SMS не ушла (429): остаёмся на phone, ошибка RATE_LIMITED, loading сброшен", async () => {
    fetchMock
      .mockReturnValueOnce(ok())
      .mockReturnValueOnce(fail("RATE_LIMITED", 429));
    const { result } = setup({ userPhone: null, userTwoFactorEnabled: false });
    await act(() => result.current.handleSwitchEnabled());
    act(() => result.current.setPhone("+380501112233"));
    await act(() => result.current.handleConnectPhone());
    expect(result.current.step).toBe("phone");
    expect(result.current.error).toBe("errors.RATE_LIMITED");
    expect(result.current.loading).toBe(false);
  });

  it("connectPhone: сетевая ошибка не роняет хук, ошибка INTERNAL", async () => {
    fetchMock.mockRejectedValue(new Error("offline"));
    const { result } = setup({
      userPhone: "+380501112233",
      userTwoFactorEnabled: false,
    });
    await act(() => result.current.handleConnectPhone());
    expect(result.current.step).toBe("idle");
    expect(result.current.error).toBe("errors.INTERNAL");
    expect(result.current.loading).toBe(false);
  });

  it("enterCode (включение): POST с phone/code/twoFactorEnabled=true, успех только по {success:true}", async () => {
    fetchMock.mockReturnValue(ok());
    const { result } = setup({ userPhone: null, userTwoFactorEnabled: false });
    act(() => {
      result.current.setPhone("+380501112233");
      result.current.setOtp("123456");
      result.current.setCurrentPassword("Passw0rd!");
    });
    await act(() => result.current.handleEnterCode());

    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toMatch(/\/user\/profile\/2fa$/);
    expect(JSON.parse(init.body)).toEqual({
      phone: "+380501112233",
      code: "123456",
      twoFactorEnabled: true,
      currentPassword: "Passw0rd!",
    });
    expect(result.current.currentPassword).toBe("");
    expect(result.current.enabled).toBe(true);
    expect(result.current.phone).toBe("+380501112233");
    expect(result.current.otp).toBe("");
    expect(result.current.step).toBe("idle");
    expect(result.current.error).toBeNull();
    // api отозвал сессию: выходим сразу
    expect(expireSession).toHaveBeenCalledTimes(1);
  });

  it("enterCode: неверный код (400 USER_INVALID_OTP) не включает 2FA, остаёмся на шаге otp, код не сбрасывается", async () => {
    fetchMock
      .mockReturnValueOnce(ok())
      .mockReturnValueOnce(ok())
      .mockReturnValueOnce(fail("USER_INVALID_OTP"));
    const { result } = setup({ userPhone: null, userTwoFactorEnabled: false });
    act(() => {
      result.current.setPhone("+380501112233");
      result.current.setOtp("000000");
    });
    await act(() => result.current.handleConnectPhone());
    expect(result.current.step).toBe("otp");
    await act(() => result.current.handleEnterCode());

    expect(result.current.step).toBe("otp");
    expect(result.current.otp).toBe("000000");
    expect(result.current.error).toBe("errors.USER_INVALID_OTP");
    expect(result.current.loading).toBe(false);
    expect(expireSession).not.toHaveBeenCalled();
  });

  it("enterCode: USER_INVALID_PASSWORD показывается у поля пароля, а не общей ошибкой", async () => {
    fetchMock.mockReturnValue(fail("USER_INVALID_PASSWORD"));
    const { result } = setup({ userPhone: null, userTwoFactorEnabled: false });
    act(() => {
      result.current.setPhone("+380501112233");
      result.current.setOtp("123456");
      result.current.setCurrentPassword("wrong");
    });
    await act(() => result.current.handleEnterCode());

    expect(result.current.passwordError).toBe("errors.USER_INVALID_PASSWORD");
    expect(result.current.error).toBeNull();
    expect(result.current.enabled).toBe(false);
    expect(expireSession).not.toHaveBeenCalled();
  });

  it("enterCode: 200 без {success:true} не считается успехом (раньше пустое тело давало «2FA включена»)", async () => {
    fetchMock.mockReturnValue(ok({}));
    const { result } = setup({ userPhone: null, userTwoFactorEnabled: false });
    act(() => {
      result.current.setPhone("+380501112233");
      result.current.setOtp("123456");
    });
    await act(() => result.current.handleEnterCode());
    expect(result.current.error).toBe("errors.INTERNAL");
    expect(result.current.phone).toBe("+380501112233");
    expect(result.current.enabled).toBe(false);
    expect(result.current.otp).toBe("123456");
  });

  it("enterCode: тело ответа не JSON -> ошибка, а не необработанный reject", async () => {
    fetchMock.mockReturnValue(
      Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.reject(new SyntaxError("x")),
      }),
    );
    const { result } = setup({ userPhone: null, userTwoFactorEnabled: false });
    act(() => {
      result.current.setPhone("+380501112233");
      result.current.setOtp("123456");
    });
    await act(() => result.current.handleEnterCode());
    expect(result.current.error).toBe("errors.INTERNAL");
    expect(result.current.loading).toBe(false);
  });

  it("выключение: SMS на сохранённый номер (пустое тело), затем enterCode сбрасывает телефон", async () => {
    fetchMock.mockReturnValue(ok());
    const { result } = setup({
      userPhone: "+380501112233",
      userTwoFactorEnabled: true,
    });
    await act(() => result.current.handleSwitchEnabled());
    expect(result.current.step).toBe("otp");
    expect(JSON.parse(fetchMock.mock.calls[0]![1].body)).toEqual({});
    act(() => {
      result.current.setOtp("654321");
      result.current.setCurrentPassword("Passw0rd!");
    });
    await act(() => result.current.handleEnterCode());

    const body = JSON.parse(fetchMock.mock.calls[1]![1].body);
    expect(body.twoFactorEnabled).toBe(false);
    expect(body.currentPassword).toBe("Passw0rd!");
    expect(result.current.enabled).toBe(false);
    expect(result.current.phone).toBeNull();
    expect(result.current.loading).toBe(false);
  });

  it("выключение: если SMS не ушла, loading сбрасывается (Switch не пропадает), ошибка показана", async () => {
    fetchMock.mockReturnValue(fail("RATE_LIMITED", 429));
    const { result } = setup({
      userPhone: "+380501112233",
      userTwoFactorEnabled: true,
    });
    await act(() => result.current.handleSwitchEnabled());
    expect(result.current.loading).toBe(false);
    expect(result.current.step).toBe("idle");
    expect(result.current.enabled).toBe(true);
    expect(result.current.error).toBe("errors.RATE_LIMITED");
  });

  it("выключение без сохранённого номера: запросов нет", async () => {
    const { result } = setup({ userPhone: null, userTwoFactorEnabled: true });
    await act(() => result.current.handleSwitchEnabled());
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
