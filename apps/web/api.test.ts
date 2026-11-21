import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { API_URL } from "./api";

const CLIENT = "http://client.test/api";
const SERVER = "http://server.test/api";

describe("API_URL", () => {
  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_API_CLIENT_URL", CLIENT);
    vi.stubEnv("NEXT_PUBLIC_API_SERVER_URL", SERVER);
  });
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("клиентские эндпоинты (браузер) строятся от NEXT_PUBLIC_API_CLIENT_URL", () => {
    expect(API_URL.auth.login()).toBe(`${CLIENT}/service-auth/login`);
    expect(API_URL.auth.createAccount()).toBe(`${CLIENT}/service-auth/register`);
    expect(API_URL.auth.twoFactor()).toBe(`${CLIENT}/service-auth/verify-otp`);
    expect(API_URL.users.email()).toBe(`${CLIENT}/user/profile`);
    expect(API_URL.users.password()).toBe(`${CLIENT}/user/profile/password`);
    expect(API_URL.users.phone()).toBe(`${CLIENT}/user/profile/phone`);
    expect(API_URL.users.setTwoFactor()).toBe(`${CLIENT}/user/profile/2fa`);
    expect(API_URL.sms.sendSmsCode()).toBe(`${CLIENT}/sender/sms/send`);
    expect(API_URL.billing.subscriptionsUpgrade()).toBe(
      `${CLIENT}/billing/subscriptions/upgrade`,
    );
    expect(API_URL.billing.subscriptionsRenew()).toBe(
      `${CLIENT}/billing/subscriptions/renew`,
    );
    expect(API_URL.billing.createPortalSession()).toBe(
      `${CLIENT}/billing/create-portal-session`,
    );
    expect(API_URL.billing.paymentMethodsClient()).toBe(
      `${CLIENT}/billing/payment-methods`,
    );
    expect(API_URL.todos.create()).toBe(`${CLIENT}/todos`);
    expect(API_URL.todos.uploadImage()).toBe(`${CLIENT}/todos/upload-image`);
  });

  it("серверные эндпоинты (SSR) строятся от NEXT_PUBLIC_API_SERVER_URL", () => {
    expect(API_URL.auth.validate()).toBe(`${SERVER}/service-auth/validate`);
    expect(API_URL.users.profile()).toBe(`${SERVER}/user/profile`);
    expect(API_URL.billing.userBilling()).toBe(`${SERVER}/billing/user`);
    expect(API_URL.billing.paymentMethods()).toBe(
      `${SERVER}/billing/payment-methods`,
    );
    expect(API_URL.billing.products()).toBe(`${SERVER}/billing/products`);
    expect(API_URL.billing.syncProducts()).toBe(
      `${SERVER}/billing/products/sync`,
    );
    expect(API_URL.billing.checkout()).toBe(`${CLIENT}/billing/checkout`);
    expect(API_URL.auth.logout()).toBe(`${CLIENT}/service-auth/logout`);
  });

  it("эндпоинты с параметрами подставляют id", () => {
    expect(API_URL.billing.paymentMethodsById("pm_123")).toBe(
      `${CLIENT}/billing/payment-methods/pm_123`,
    );
    expect(API_URL.billing.paymentIntentCreate("pi_1")).toBe(
      `${CLIENT}/billing/payment-intents/pi_1`,
    );
    expect(API_URL.todos.edit("t1")).toBe(`${CLIENT}/todos/t1`);
    expect(API_URL.todos.delete("t1")).toBe(`${CLIENT}/todos/t1`);
    // список задач грузит браузер (client component): публичный CLIENT URL
    expect(API_URL.todos.list("createdAt", "desc")).toBe(
      `${CLIENT}/todos?sortBy=createdAt&sortOrder=desc`,
    );
  });

  it("URL читаются из env в момент вызова, а не при импорте", () => {
    vi.stubEnv("NEXT_PUBLIC_API_CLIENT_URL", "http://other.test");
    expect(API_URL.auth.login()).toBe("http://other.test/service-auth/login");
  });

  it("пути emails совпадают с контроллером api (sender/emails)", () => {
    expect(API_URL.emails.sendVerification()).toBe(
      `${CLIENT}/sender/emails/send-verification`,
    );
    expect(API_URL.emails.verifyEmail()).toBe(
      `${CLIENT}/sender/emails/verify-email`,
    );
  });

  it("todos.list кодирует спецсимволы в query", () => {
    const url = API_URL.todos.list("a&b", "d c");

    expect(url).toContain("sortBy=a%26b");
    expect(url).toContain("sortOrder=d%20c");
  });

  it("id в path кодируется", () => {
    expect(API_URL.todos.edit("../x")).not.toContain("../x");
    expect(API_URL.todos.edit("../x")).toBe(`${CLIENT}/todos/..%2Fx`);
    expect(API_URL.todos.delete("a/b?c")).toBe(`${CLIENT}/todos/a%2Fb%3Fc`);
    expect(API_URL.billing.paymentMethodsById("pm/../1")).toBe(
      `${CLIENT}/billing/payment-methods/pm%2F..%2F1`,
    );
    expect(API_URL.billing.paymentIntentCreate("pi 1")).toBe(
      `${CLIENT}/billing/payment-intents/pi%201`,
    );
  });
});
