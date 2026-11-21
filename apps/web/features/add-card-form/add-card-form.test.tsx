import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

const { stripeState } = vi.hoisted(() => ({
  stripeState: {
    stripe: null as unknown,
    elements: null as unknown,
  },
}));

vi.mock("@stripe/react-stripe-js", () => ({
  useStripe: () => stripeState.stripe,
  useElements: () => stripeState.elements,
  CardNumberElement: () => <div data-testid="card-number" />,
  CardExpiryElement: () => <div data-testid="card-expiry" />,
  CardCvcElement: () => <div data-testid="card-cvc" />,
}));
vi.mock("next-intl", () => ({ useTranslations: () => (k: string) => k }));

import { AddCardForm } from "./add-card-form";

const fetchMock = vi.fn();
const createPaymentMethod = vi.fn();
const getElement = vi.fn();
const json = (body: unknown, ok = true) =>
  Promise.resolve({ ok, json: () => Promise.resolve(body) });

const submit = () => fireEvent.click(screen.getByRole("button"));

describe("AddCardForm", () => {
  beforeEach(() => {
    fetchMock.mockReset();
    createPaymentMethod.mockReset();
    getElement.mockReset();
    getElement.mockReturnValue({ kind: "card-number-element" });
    stripeState.stripe = { createPaymentMethod };
    stripeState.elements = { getElement };
    vi.stubGlobal("fetch", fetchMock);
  });
  afterEach(() => vi.unstubAllGlobals());

  it("пока Stripe не загрузился, кнопка заблокирована и запросов нет", () => {
    stripeState.stripe = null;
    stripeState.elements = null;
    render(<AddCardForm onSuccess={vi.fn()} />);
    expect(screen.getByRole("button")).toBeDisabled();
    submit();
    expect(createPaymentMethod).not.toHaveBeenCalled();
  });

  it("успех: createPaymentMethod -> POST payment-methods/:id -> onSuccess", async () => {
    createPaymentMethod.mockResolvedValue({ paymentMethod: { id: "pm_test_1" } });
    fetchMock.mockReturnValue(json({}));
    const onSuccess = vi.fn().mockResolvedValue(undefined);
    render(<AddCardForm onSuccess={onSuccess} />);
    submit();

    await waitFor(() => expect(onSuccess).toHaveBeenCalledTimes(1));
    expect(createPaymentMethod).toHaveBeenCalledWith({
      type: "card",
      card: { kind: "card-number-element" },
    });
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toMatch(/\/billing\/payment-methods\/pm_test_1$/);
    expect(init).toMatchObject({ method: "POST", credentials: "include" });
    await waitFor(() => expect(screen.getByRole("button")).toBeEnabled());
  });

  it("ошибка Stripe (4242 declined и т.п.): показывает сообщение, на сервер не идём", async () => {
    createPaymentMethod.mockResolvedValue({
      error: { message: "Your card number is incomplete." },
    });
    const onSuccess = vi.fn();
    render(<AddCardForm onSuccess={onSuccess} />);
    submit();
    expect(await screen.findByText("Your card number is incomplete.")).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
    expect(onSuccess).not.toHaveBeenCalled();
    expect(screen.getByRole("button")).toBeEnabled();
  });

  it("ошибка API: показывает сообщение сервера, onSuccess не вызывается", async () => {
    createPaymentMethod.mockResolvedValue({ paymentMethod: { id: "pm_1" } });
    fetchMock.mockReturnValue(json({ message: "Card already attached" }, false));
    const onSuccess = vi.fn();
    render(<AddCardForm onSuccess={onSuccess} />);
    submit();
    expect(await screen.findByText("Card already attached")).toBeInTheDocument();
    expect(onSuccess).not.toHaveBeenCalled();
    expect(screen.getByRole("button")).toBeEnabled();
  });

  it("сетевая ошибка: показывает message ошибки", async () => {
    createPaymentMethod.mockResolvedValue({ paymentMethod: { id: "pm_1" } });
    fetchMock.mockRejectedValue(new Error("Failed to fetch"));
    render(<AddCardForm onSuccess={vi.fn()} />);
    submit();
    expect(await screen.findByText("Failed to fetch")).toBeInTheDocument();
  });

  it("ошибка очищается при повторной отправке", async () => {
    createPaymentMethod
      .mockResolvedValueOnce({ error: { message: "bad card" } })
      .mockResolvedValueOnce({ paymentMethod: { id: "pm_1" } });
    fetchMock.mockReturnValue(json({}));
    render(<AddCardForm onSuccess={vi.fn()} />);
    submit();
    await screen.findByText("bad card");
    submit();
    await waitFor(() => expect(screen.queryByText("bad card")).not.toBeInTheDocument());
  });

  it("повторная отправка блокируется, пока идёт запрос", async () => {
    let resolve!: (v: unknown) => void;
    createPaymentMethod.mockReturnValue(new Promise((r) => (resolve = r)));
    render(<AddCardForm onSuccess={vi.fn()} />);
    submit();
    await waitFor(() => expect(screen.getByRole("button")).toBeDisabled());
    submit();
    expect(createPaymentMethod).toHaveBeenCalledTimes(1);
    resolve({ error: { message: "x" } });
    await screen.findByText("x");
  });

  it("если CardNumberElement не найден, кнопка не зависает: показывается ошибка из i18n, Stripe не вызывается", async () => {
    getElement.mockReturnValue(null);
    render(<AddCardForm onSuccess={vi.fn()} />);
    submit();
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "payment_new_error_not_ready",
    );
    expect(screen.getByRole("button")).toBeEnabled();
    expect(createPaymentMethod).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("сообщение при пустом message Stripe идёт через i18n", async () => {
    createPaymentMethod.mockResolvedValue({ error: {} });
    render(<AddCardForm onSuccess={vi.fn()} />);
    submit();
    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("payment_new_error_validation");
    expect(alert.textContent).not.toMatch(/[А-Яа-я]/);
  });

  it("ответ API не JSON (502 от прокси): сообщение из i18n, а не необработанный reject", async () => {
    createPaymentMethod.mockResolvedValue({ paymentMethod: { id: "pm_1" } });
    fetchMock.mockReturnValue(
      Promise.resolve({ ok: false, json: () => Promise.reject(new SyntaxError("x")) }),
    );
    const onSuccess = vi.fn();
    render(<AddCardForm onSuccess={onSuccess} />);
    submit();
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "payment_new_error_save",
    );
    expect(onSuccess).not.toHaveBeenCalled();
    expect(screen.getByRole("button")).toBeEnabled();
  });
});
