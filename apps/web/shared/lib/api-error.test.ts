import { describe, expect, it } from "vitest";
import { API_ERROR_CODES, apiErrorKey, getApiErrorCode } from "./api-error";

const response = (status: number, body?: unknown, rawText?: string) =>
  ({
    status,
    json: () =>
      rawText !== undefined
        ? Promise.reject(new SyntaxError("Unexpected token"))
        : Promise.resolve(body),
  }) as unknown as Response;

describe("getApiErrorCode", () => {
  it.each(API_ERROR_CODES.filter((c) => c !== "RATE_LIMITED"))(
    "берёт известный code из тела: %s",
    async (code) => {
      await expect(getApiErrorCode(response(400, { code }))).resolves.toBe(code);
    },
  );

  it("429 всегда RATE_LIMITED, даже если тело другое или не JSON", async () => {
    await expect(getApiErrorCode(response(429, { code: "INTERNAL" }))).resolves.toBe(
      "RATE_LIMITED",
    );
    await expect(getApiErrorCode(response(429, undefined, "x"))).resolves.toBe(
      "RATE_LIMITED",
    );
  });

  it("неизвестный code из тела игнорируется (нет подстановки произвольных ключей i18n)", async () => {
    await expect(
      getApiErrorCode(response(500, { code: "__proto__.polluted" })),
    ).resolves.toBe("INTERNAL");
    await expect(getApiErrorCode(response(400, { code: 123 }))).resolves.toBe("INTERNAL");
  });

  it.each([
    [401, "UNAUTHORIZED"],
    [403, "FORBIDDEN"],
    [404, "NOT_FOUND"],
    [409, "CONFLICT"],
    [413, "PAYLOAD_TOO_LARGE"],
    [500, "INTERNAL"],
    [502, "INTERNAL"],
  ])("тело не JSON (прокси, 502): статус %i -> %s", async (status, code) => {
    await expect(getApiErrorCode(response(status, undefined, "<html>"))).resolves.toBe(code);
  });

  it("пустое тело и null не роняют", async () => {
    await expect(getApiErrorCode(response(500, null))).resolves.toBe("INTERNAL");
    await expect(getApiErrorCode(response(401, {}))).resolves.toBe("UNAUTHORIZED");
  });

  it("код из тела приоритетнее статуса (409 AUTH_EMAIL_TAKEN)", async () => {
    await expect(
      getApiErrorCode(response(409, { code: "AUTH_EMAIL_TAKEN" })),
    ).resolves.toBe("AUTH_EMAIL_TAKEN");
  });
});

describe("apiErrorKey", () => {
  it("строит ключ common.errors.<CODE> относительно корня", () => {
    expect(apiErrorKey("AUTH_INVALID_OTP")).toBe("errors.AUTH_INVALID_OTP");
  });
});
