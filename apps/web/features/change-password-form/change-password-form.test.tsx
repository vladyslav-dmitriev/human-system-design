import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

const { toast, expireSession } = vi.hoisted(() => ({
  toast: { success: vi.fn(), error: vi.fn() },
  expireSession: vi.fn(),
}));
vi.mock("sonner", () => ({ toast }));
vi.mock("next-intl", () => ({ useTranslations: () => (k: string) => k }));
vi.mock("@/shared/lib/api-client", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/shared/lib/api-client")>()),
  expireSession,
}));

import { ChangePasswordForm } from "./change-password-form";

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
  render(<ChangePasswordForm />);
  return {
    user,
    current: screen.getByPlaceholderText("password_current_label"),
    next: screen.getByPlaceholderText("password_new_label"),
    button: screen.getByRole("button"),
  };
};

describe("ChangePasswordForm", () => {
  beforeEach(() => {
    fetchMock.mockReset();
    toast.success.mockReset();
    toast.error.mockReset();
    expireSession.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });
  afterEach(() => vi.unstubAllGlobals());

  it("кнопка заблокирована на пустой форме и пока одно из полей пустое", async () => {
    const { user, current, button } = setup();
    expect(button).toBeDisabled();
    await user.type(current, "oldpass123");
    expect(button).toBeDisabled();
  });

  it("кнопка заблокирована, если новый пароль равен текущему", async () => {
    const { user, current, next, button } = setup();
    await user.type(current, "samepass123");
    await user.type(next, "samepass123");
    expect(button).toBeDisabled();
  });

  it("новый пароль короче 8 символов: ошибка password_min_length", async () => {
    const { user, current, next, button } = setup();
    await user.type(current, "oldpass123");
    await user.type(next, "short");
    await user.click(button);
    expect(await screen.findByText("password_min_length")).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("граница: 8 символов проходит валидацию", async () => {
    fetchMock.mockReturnValue(json({}));
    const { user, current, next, button } = setup();
    await user.type(current, "oldpass123");
    await user.type(next, "12345678");
    await user.click(button);
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    expect(screen.queryByText("password_min_length")).not.toBeInTheDocument();
  });

  it("успех: PATCH с обоими паролями, toast.success, поля очищаются", async () => {
    fetchMock.mockReturnValue(json({}));
    const { user, current, next, button } = setup();
    await user.type(current, "oldpass123");
    await user.type(next, "newpass456");
    await user.click(button);

    await waitFor(() => expect(toast.success).toHaveBeenCalledTimes(1));
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toMatch(/\/user\/profile\/password$/);
    expect(init.method).toBe("PATCH");
    expect(JSON.parse(init.body)).toEqual({
      currentPassword: "oldpass123",
      newPassword: "newpass456",
    });
    await waitFor(() => expect(current).toHaveValue(""));
    expect(next).toHaveValue("");
  });

  it("граница сверху: 72 байта проходят, 73 байта: ошибка password_max_length", async () => {
    fetchMock.mockReturnValue(json({ success: true }));
    const { user, current, next, button } = setup();
    await user.type(current, "oldpass123");
    await user.type(next, "a".repeat(73));
    await user.click(button);
    expect(await screen.findByText("password_max_length")).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();

    await user.type(next, "a".repeat(72));
    await user.click(button);
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
  });

  it("после успешной смены сессия завершается сразу, при ошибке нет", async () => {
    fetchMock.mockReturnValueOnce(
      json({ code: "USER_INVALID_PASSWORD" }, false, 400),
    );
    const { user, current, next, button } = setup();
    await user.type(current, "wrongpass1");
    await user.type(next, "newpass456");
    await user.click(button);
    await screen.findByText("errors.USER_INVALID_PASSWORD");
    expect(expireSession).not.toHaveBeenCalled();

    fetchMock.mockReturnValue(json({ success: true }));
    await user.type(current, "oldpass123");
    await user.click(button);
    await waitFor(() => expect(expireSession).toHaveBeenCalledTimes(1));
  });

  it("лимит считается в байтах: 37 двухбайтовых символов (74 байта) отклоняются", async () => {
    const { user, current, next, button } = setup();
    await user.type(current, "oldpass123");
    await user.type(next, "é".repeat(37));
    await user.click(button);
    expect(await screen.findByText("password_max_length")).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("USER_INVALID_PASSWORD (API 400): ошибка у поля текущего пароля, поля остаются, toast.success нет", async () => {
    fetchMock.mockReturnValue(
      json(
        { code: "USER_INVALID_PASSWORD", message: "Wrong password" },
        false,
        400,
      ),
    );
    const { user, current, next, button } = setup();
    await user.type(current, "wrongpass1");
    await user.type(next, "newpass456");
    await user.click(button);
    expect(
      await screen.findByText("errors.USER_INVALID_PASSWORD"),
    ).toBeInTheDocument();
    expect(toast.success).not.toHaveBeenCalled();
    expect(current).toHaveValue("wrongpass1");
    expect(next).toHaveValue("newpass456");
  });

  it("прочая ошибка API (500): toast.error с текстом из i18n по коду, не из тела ответа", async () => {
    fetchMock.mockReturnValue(
      json({ code: "INTERNAL", message: "raw server text" }, false, 500),
    );
    const { user, current, next, button } = setup();
    await user.type(current, "oldpass123");
    await user.type(next, "newpass456");
    await user.click(button);
    await waitFor(() => expect(toast.error).toHaveBeenCalledTimes(1));
    expect(toast.error.mock.calls[0]![1]).toEqual({
      description: "errors.INTERNAL",
    });
    expect(current).toHaveValue("oldpass123");
  });

  it("сетевая ошибка: toast.error (INTERNAL), кнопка разблокируется", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    fetchMock.mockRejectedValue(new Error("Failed to fetch"));
    const { user, current, next, button } = setup();
    await user.type(current, "oldpass123");
    await user.type(next, "newpass456");
    await user.click(button);
    await waitFor(() => expect(toast.error).toHaveBeenCalledTimes(1));
    expect(toast.error.mock.calls[0]![1]).toEqual({
      description: "errors.INTERNAL",
    });
    await waitFor(() => expect(button).toBeEnabled());
  });

  it("повторная отправка блокируется, пока запрос выполняется", async () => {
    let resolve!: (v: unknown) => void;
    fetchMock.mockReturnValue(new Promise((r) => (resolve = r)));
    const { user, current, next, button } = setup();
    await user.type(current, "oldpass123");
    await user.type(next, "newpass456");
    await user.click(button);
    await waitFor(() => expect(button).toBeDisabled());
    await user.click(button);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    resolve({ ok: true, json: () => Promise.resolve({}) });
    await waitFor(() => expect(toast.success).toHaveBeenCalled());
  });

  it("тексты toast идут через i18n (ключи), а не русские строки", async () => {
    fetchMock.mockReturnValue(json({ success: true }));
    const { user, current, next, button } = setup();
    await user.type(current, "oldpass123");
    await user.type(next, "newpass456");
    await user.click(button);
    await waitFor(() => expect(toast.success).toHaveBeenCalled());
    expect(toast.success.mock.calls[0]![0]).not.toMatch(/[А-Яа-я]/);
    expect(toast.success.mock.calls[0]![0]).toBe("password_changed_title");
  });
});
