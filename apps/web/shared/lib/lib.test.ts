import { afterEach, describe, expect, it, vi } from "vitest";
import { getErrorMessage } from "./error";
import { ls } from "./ls";
import { normalizePath } from "./normalize-path";
import { formatStripePrice, getFormattedPrice } from "./price";
import { cn } from "./utils";

describe("getErrorMessage", () => {
  it("берёт message у Error", () => {
    expect(getErrorMessage(new Error("boom"))).toBe("boom");
  });
  it("приводит не-Error к строке", () => {
    expect(getErrorMessage("text")).toBe("text");
    expect(getErrorMessage(null)).toBe("null");
    expect(getErrorMessage(undefined)).toBe("undefined");
  });
});

describe("ls (localStorage)", () => {
  afterEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it("get возвращает распарсенный JSON", () => {
    localStorage.setItem("k", JSON.stringify({ a: 1 }));
    expect(ls.get("k")).toEqual({ a: 1 });
  });
  it("get возвращает undefined для отсутствующего ключа", () => {
    expect(ls.get("missing")).toBeUndefined();
  });
  it("get возвращает undefined для битого JSON", () => {
    localStorage.setItem("k", "{not json");
    expect(ls.get("k")).toBeUndefined();
  });
  it("get не падает, если localStorage недоступен", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("denied");
    });
    expect(ls.get("k")).toBeUndefined();
  });
  it("set и remove работают", () => {
    ls.set("k", '"v"');
    expect(ls.get("k")).toBe("v");
    ls.remove("k");
    expect(ls.get("k")).toBeUndefined();
  });
});

describe("normalizePath", () => {
  it("убирает префикс локали", () => {
    expect(normalizePath("/uk/login")).toBe("/login");
    expect(normalizePath("/en/settings/profile")).toBe("/settings/profile");
  });
  it("корень локали даёт /", () => {
    expect(normalizePath("/uk")).toBe("/");
  });
  it("путь без локали не искажается", () => {
    expect(normalizePath("/login")).toBe("/login");
    expect(normalizePath("/settings/security")).toBe("/settings/security");
    expect(normalizePath("/")).toBe("/");
  });
  it("неизвестная локаль не считается локалью", () => {
    expect(normalizePath("/fr/login")).toBe("/fr/login");
  });
});

describe("price", () => {
  it("formatStripePrice переводит центы в строку с 2 знаками", () => {
    expect(formatStripePrice(1999)).toBe("19.99");
    expect(formatStripePrice(0)).toBe("0.00");
    expect(formatStripePrice(5)).toBe("0.05");
  });
  it("getFormattedPrice форматирует валюту", () => {
    expect(getFormattedPrice(1999, "usd")).toBe("$19.99");
    expect(getFormattedPrice(1999, "USD")).toBe("$19.99");
  });
  it("getFormattedPrice: null/undefined сумма даёт 0, пустая валюта даёт usd", () => {
    expect(getFormattedPrice(null, null)).toBe("$0.00");
    expect(getFormattedPrice(undefined, undefined)).toBe("$0.00");
  });
  it("getFormattedPrice учитывает локаль", () => {
    expect(getFormattedPrice(123456, "usd", "uk")).toMatch(/1\s?234,56/);
    expect(getFormattedPrice(123456, "usd", "en")).toBe("$1,234.56");
  });
});

describe("cn", () => {
  it("склеивает классы и разрешает конфликты tailwind", () => {
    expect(cn("p-2", "p-4")).toBe("p-4");
    expect(cn("a", false && "b", undefined, "c")).toBe("a c");
  });
});
