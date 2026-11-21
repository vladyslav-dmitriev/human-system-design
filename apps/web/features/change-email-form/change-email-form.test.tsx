import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

const { toast } = vi.hoisted(() => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));
vi.mock("sonner", () => ({ toast }));
vi.mock("next-intl", () => ({ useTranslations: () => (k: string) => k }));

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
  const button = screen.getByTestId("email-change-button");
  return { user, input, button };
};

describe("ChangeEmailForm", () => {
  beforeEach(() => {
    fetchMock.mockReset();
    toast.success.mockReset();
    toast.error.mockReset();
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
      expect(await screen.findByText("email_error_invalid")).toBeInTheDocument();
      expect(fetchMock).not.toHaveBeenCalled();
    },
  );

  it("успех: PATCH с email, toast.success, форма сбрасывается", async () => {
    fetchMock.mockReturnValue(json({}));
    const { user, input, button } = setup();
    await user.clear(input);
    await user.type(input, "New@Example.com");
    await user.click(button);

    await waitFor(() => expect(toast.success).toHaveBeenCalledTimes(1));
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toMatch(/\/user\/profile$/);
    expect(init).toMatchObject({ method: "PATCH", credentials: "include" });
    expect(JSON.parse(init.body)).toEqual({ email: "New@Example.com" });
    await waitFor(() => expect(button).toBeDisabled());
    expect(toast.error).not.toHaveBeenCalled();
  });

  it("ошибка API (409): toast.error с сообщением сервера, форма не сбрасывается", async () => {
    fetchMock.mockReturnValue(json({ message: "Email already in use" }, false, 409));
    const { user, input, button } = setup();
    await user.clear(input);
    await user.type(input, "taken@example.com");
    await user.click(button);

    await waitFor(() => expect(toast.error).toHaveBeenCalledTimes(1));
    expect(toast.error.mock.calls[0]![1]).toEqual({
      description: "Email already in use",
    });
    expect(toast.success).not.toHaveBeenCalled();
    expect(input).toHaveValue("taken@example.com");
    await waitFor(() => expect(button).toBeEnabled());
  });

  it("сетевая ошибка: toast.error, кнопка разблокируется", async () => {
    fetchMock.mockRejectedValue(new Error("Failed to fetch"));
    const { user, input, button } = setup();
    await user.clear(input);
    await user.type(input, "new@example.com");
    await user.click(button);
    await waitFor(() => expect(toast.error).toHaveBeenCalled());
    expect(toast.error.mock.calls[0]![1]).toEqual({ description: "Failed to fetch" });
    await waitFor(() => expect(button).toBeEnabled());
  });

  it("повторная отправка блокируется, пока запрос в полёте", async () => {
    let resolve!: (v: unknown) => void;
    fetchMock.mockReturnValue(new Promise((r) => (resolve = r)));
    const { user, input, button } = setup();
    await user.clear(input);
    await user.type(input, "new@example.com");
    await user.click(button);
    await waitFor(() => expect(button).toBeDisabled());
    expect(input).toBeDisabled();
    await user.click(button);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    resolve({ ok: true, json: () => Promise.resolve({}) });
    await waitFor(() => expect(toast.success).toHaveBeenCalled());
  });

  // BUG: см. FIX.md "Захардкоженные тексты вместо i18n"
  it.fails("тексты toast идут через i18n (ключи), а не русские строки", async () => {
    fetchMock.mockReturnValue(json({}));
    const { user, input, button } = setup();
    await user.clear(input);
    await user.type(input, "new@example.com");
    await user.click(button);
    await waitFor(() => expect(toast.success).toHaveBeenCalled());
    expect(toast.success.mock.calls[0]![0]).not.toMatch(/[А-Яа-я]/);
  });
});
