import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

const { toast, expireSession } = vi.hoisted(() => ({
  toast: { success: vi.fn(), error: vi.fn() },
  expireSession: vi.fn(),
}));
vi.mock("sonner", () => ({ toast }));
vi.mock("next-intl", () => ({
  useTranslations: () => (k: string) => k,
  useLocale: () => "uk",
}));
vi.mock("@/shared/lib/api-client", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/shared/lib/api-client")>()),
  expireSession,
}));

import { ChangeEmailForm } from "./change-email-form";

// @testing-library/user-event не установлен: минимальная замена на fireEvent (type заменяет значение)
const userEvent = {
  setup: () => ({
    clear: async (el: Element) => {
      fireEvent.change(el, { target: { value: "" } });
    },
    type: async (el: Element, value: string) => {
      fireEvent.change(el, { target: { value } });
    },
    click: async (el: Element) => {
      fireEvent.click(el);
    },
  }),
};

const fetchMock = vi.fn();
const json = (body: unknown, ok = true, status = 200) =>
  Promise.resolve({ ok, status, json: () => Promise.resolve(body) });

const setup = () => {
  const user = userEvent.setup();
  render(<ChangeEmailForm currentEmail="old@example.com" />);
  const input = screen.getByTestId("email-change-input");
  const password = screen.getByTestId("email-change-password-input");
  const button = screen.getByTestId("email-change-button");
  return { user, input, password, button };
};

describe("ChangeEmailForm", () => {
  beforeEach(() => {
    fetchMock.mockReset();
    toast.success.mockReset();
    toast.error.mockReset();
    expireSession.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });
  afterEach(() => vi.unstubAllGlobals());

  it("показывает текущий email, кнопка заблокирована пока нет изменений", () => {
    const { input, button } = setup();
    expect(input).toHaveValue("old@example.com");
    expect(button).toBeDisabled();
  });

  it("кнопка активируется после изменения и снова блокируется при возврате старого значения", async () => {
    const { user, input, button } = setup();
    await user.clear(input);
    await user.type(input, "new@example.com");
    expect(button).toBeEnabled();
    await user.clear(input);
    await user.type(input, "old@example.com");
    expect(button).toBeDisabled();
  });

  it("пустой email: ошибка email_error_empty, запрос не уходит", async () => {
    const { user, input, button } = setup();
    await user.clear(input);
    await user.click(button);
    expect(await screen.findByText("email_error_empty")).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it.each(["abc", "a@b", "a@b.c", "@x.com", "a b@x.com"])(
    "невалидный email %s: ошибка email_error_invalid",
    async (value) => {
      const { user, input, button } = setup();
      await user.clear(input);
      await user.type(input, value);
      await user.click(button);
      expect(
        await screen.findByText("email_error_invalid"),
      ).toBeInTheDocument();
      expect(fetchMock).not.toHaveBeenCalled();
    },
  );

  it("пустой текущий пароль: ошибка password_enter_current, запрос не уходит", async () => {
    const { user, input, button } = setup();
    await user.clear(input);
    await user.type(input, "new@example.com");
    await user.click(button);
    expect(
      await screen.findByText("password_enter_current"),
    ).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("успех: PATCH с нормализованным email и currentPassword, toast.success, форма и пароль сбрасываются", async () => {
    fetchMock.mockReturnValue(json({ success: true }));
    const { user, input, password, button } = setup();
    await user.clear(input);
    await user.type(input, "  New@Example.com ");
    await user.type(password, "Current-Pass1");
    await user.click(button);

    await waitFor(() => expect(toast.success).toHaveBeenCalledTimes(1));
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toMatch(/\/user\/profile$/);
    expect(init).toMatchObject({ method: "PATCH", credentials: "include" });
    expect(JSON.parse(init.body)).toEqual({
      email: "new@example.com",
      currentPassword: "Current-Pass1",
    });
    expect(toast.success.mock.calls[0]![0]).toBe("email_changed_title");
    await waitFor(() => expect(button).toBeDisabled());
    expect(input).toHaveValue("new@example.com");
    expect(password).toHaveValue("");
    expect(toast.error).not.toHaveBeenCalled();
  });

  it("после смены email письмо подтверждения не запрашивается (его шлёт api), язык передаётся в Accept-Language", async () => {
    fetchMock.mockReturnValue(json({ success: true }));
    const { user, input, password, button } = setup();
    await user.clear(input);
    await user.type(input, "new@example.com");
    await user.type(password, "Current-Pass1");
    await user.click(button);

    await waitFor(() => expect(toast.success).toHaveBeenCalledTimes(1));
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).not.toMatch(/send-verification/);
    expect(init.headers["Accept-Language"]).toBe("uk");
  });

  it("после успешной смены сессия завершается сразу (api её отозвал)", async () => {
    fetchMock.mockReturnValue(json({ success: true }));
    const { user, input, password, button } = setup();
    await user.clear(input);
    await user.type(input, "new@example.com");
    await user.type(password, "Current-Pass1");
    await user.click(button);

    await waitFor(() => expect(expireSession).toHaveBeenCalledTimes(1));
  });

  it("USER_EMAIL_TAKEN (409): ошибка у поля email, форма не сбрасывается, письма нет", async () => {
    fetchMock.mockReturnValue(
      json(
        { code: "USER_EMAIL_TAKEN", message: "Email is already in use" },
        false,
        409,
      ),
    );
    const { user, input, password, button } = setup();
    await user.clear(input);
    await user.type(input, "taken@example.com");
    await user.type(password, "Current-Pass1");
    await user.click(button);

    expect(
      await screen.findByText("errors.USER_EMAIL_TAKEN"),
    ).toBeInTheDocument();
    expect(toast.success).not.toHaveBeenCalled();
    expect(expireSession).not.toHaveBeenCalled();
    expect(input).toHaveValue("taken@example.com");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(button).toBeEnabled());
  });

  it("USER_INVALID_PASSWORD (400): ошибка у поля пароля, email не меняется", async () => {
    fetchMock.mockReturnValue(
      json({ code: "USER_INVALID_PASSWORD", message: "x" }, false, 400),
    );
    const { user, input, password, button } = setup();
    await user.clear(input);
    await user.type(input, "new@example.com");
    await user.type(password, "wrong-password");
    await user.click(button);

    expect(
      await screen.findByText("errors.USER_INVALID_PASSWORD"),
    ).toBeInTheDocument();
    expect(toast.success).not.toHaveBeenCalled();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it.each([
    [429, "RATE_LIMITED", "errors.RATE_LIMITED"],
    [500, "INTERNAL", "errors.INTERNAL"],
  ])(
    "прочая ошибка API (%i): toast.error с текстом из i18n по коду",
    async (status, code, key) => {
      fetchMock.mockReturnValue(
        json({ code, message: "raw server text" }, false, status),
      );
      const { user, input, password, button } = setup();
      await user.clear(input);
      await user.type(input, "new@example.com");
      await user.type(password, "Current-Pass1");
      await user.click(button);

      await waitFor(() => expect(toast.error).toHaveBeenCalledTimes(1));
      expect(toast.error.mock.calls[0]![0]).toBe("update_error_title");
      // текст берётся из i18n, а не из тела ответа сервера
      expect(toast.error.mock.calls[0]![1]).toEqual({ description: key });
      expect(toast.success).not.toHaveBeenCalled();
    },
  );

  it("сетевая ошибка: toast.error (INTERNAL), кнопка разблокируется", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    fetchMock.mockRejectedValue(new Error("Failed to fetch"));
    const { user, input, password, button } = setup();
    await user.clear(input);
    await user.type(input, "new@example.com");
    await user.type(password, "Current-Pass1");
    await user.click(button);
    await waitFor(() => expect(toast.error).toHaveBeenCalled());
    expect(toast.error.mock.calls[0]![1]).toEqual({
      description: "errors.INTERNAL",
    });
    await waitFor(() => expect(button).toBeEnabled());
  });

  it("повторная отправка блокируется, пока запрос в полёте", async () => {
    let resolve!: (v: unknown) => void;
    fetchMock.mockReturnValue(new Promise((r) => (resolve = r)));
    const { user, input, password, button } = setup();
    await user.clear(input);
    await user.type(input, "new@example.com");
    await user.type(password, "Current-Pass1");
    await user.click(button);
    await waitFor(() => expect(button).toBeDisabled());
    expect(input).toBeDisabled();
    await user.click(button);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    fetchMock.mockReturnValue(json({ success: true }));
    resolve({ ok: true, status: 200, json: () => Promise.resolve({}) });
    await waitFor(() => expect(toast.success).toHaveBeenCalled());
  });

  it("тексты toast идут через i18n (ключи), а не русские строки", async () => {
    fetchMock.mockReturnValue(json({ success: true }));
    const { user, input, password, button } = setup();
    await user.clear(input);
    await user.type(input, "new@example.com");
    await user.type(password, "Current-Pass1");
    await user.click(button);
    await waitFor(() => expect(toast.success).toHaveBeenCalled());
    expect(toast.success.mock.calls[0]![0]).not.toMatch(/[А-Яа-я]/);
    expect(toast.success.mock.calls[0]![0]).toBe("email_changed_title");
  });
});
