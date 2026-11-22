import { test, expect } from "../fixtures";
import { SettingsPage } from "../pages/settings-page";

const ok = { success: true };
const json = (status: number, body: unknown) => ({
  status,
  contentType: "application/json",
  body: JSON.stringify(body),
});

// SMS and the 2FA endpoints are always mocked: no real SMS, no Twilio.
// Enrolment flow: PUT /user/profile/phone (number stored server-side), then
// POST /sender/sms/send with an EMPTY body (the server takes the number from the profile),
// then POST /user/profile/2fa {phone, code, twoFactorEnabled}.
test.beforeEach(async ({ page, freshUser }) => {
  void freshUser;
  await page.route("**/user/profile/phone", (route) =>
    route.fulfill(json(200, ok)),
  );
  await page.route("**/sender/sms/send", (route) =>
    route.fulfill(json(200, ok)),
  );
});

const sendCode = (page: import("@playwright/test").Page) =>
  page.getByRole("button", { name: /send code|надіслати/i });
const otpInput = (page: import("@playwright/test").Page) =>
  page.getByRole("textbox", { name: "6-digit verification code" });
const confirm = (page: import("@playwright/test").Page) =>
  page.getByRole("button", { name: /confirm|підтвердити/i });
// Change of 2FA requires the current password (security fix wave). The settings page has several
// "Current password" fields, so take the one inside the innermost block that holds the OTP input.
const twoFactorPassword = (page: import("@playwright/test").Page) =>
  page
    .locator("div", { has: otpInput(page) })
    .filter({ has: page.getByLabel("Current password") })
    .last()
    .getByLabel("Current password");

async function openPhoneStep(page: import("@playwright/test").Page) {
  const settingsPage = new SettingsPage(page);
  await settingsPage.goto();
  const phone = page.getByPlaceholder("+380 (XX) XXX XX XX");
  // The page is server-rendered: a click before hydration is lost, so retry the click.
  await expect(async () => {
    await page.getByRole("switch").click();
    await expect(phone).toBeVisible({ timeout: 3_000 });
  }).toPass({ timeout: 60_000 });
  return phone;
}

async function openOtpStep(page: import("@playwright/test").Page) {
  const phone = await openPhoneStep(page);
  await phone.fill("+380501234567");
  await sendCode(page).click();
  await expect(otpInput(page)).toBeVisible();
}

test("2FA: enabling the switch shows the phone form", async ({ page }) => {
  const phone = await openPhoneStep(page);

  await expect(phone).toBeVisible();
  await expect(sendCode(page)).toBeVisible();
});

test("2FA: empty phone does not store a phone or request an SMS", async ({
  page,
}) => {
  const phone = await openPhoneStep(page);
  let requested = false;
  for (const url of ["**/user/profile/phone", "**/sender/sms/send"]) {
    await page.route(url, (route) => {
      requested = true;
      return route.fulfill(json(200, ok));
    });
  }
  await expect(phone).toBeVisible();

  await sendCode(page).click();

  await expect(phone).toBeVisible();
  expect(requested).toBe(false);
});

test("2FA: valid phone is stored, an SMS is requested with an empty body, and the code form has 6 slots", async ({
  page,
}) => {
  const phone = await openPhoneStep(page);
  await phone.fill("+380501234567");
  const put = page.waitForRequest(
    (r) => r.url().endsWith("/user/profile/phone") && r.method() === "PUT",
  );
  const sms = page.waitForRequest(
    (r) => r.url().endsWith("/sender/sms/send") && r.method() === "POST",
  );

  await sendCode(page).click();

  expect((await put).postDataJSON()).toEqual({ phone: "+380501234567" });
  // the client cannot choose the SMS recipient and sends no captcha token
  expect((await sms).postDataJSON()).toEqual({});
  await expect(page.getByText("+380501234567")).toBeVisible();
  const otp = otpInput(page);
  await otp.fill("1234567");
  await expect(otp).toHaveValue("123456");
});

test("2FA: confirm is disabled until the 6 digits and the current password are entered", async ({
  page,
  freshUser,
}) => {
  await openOtpStep(page);

  await expect(confirm(page)).toBeDisabled();
  await otpInput(page).fill("12345");
  await expect(confirm(page)).toBeDisabled();
  await otpInput(page).fill("123456");
  await expect(confirm(page)).toBeDisabled();
  await twoFactorPassword(page).fill(freshUser.password);
  await expect(confirm(page)).toBeEnabled();
});

test("2FA: correct code enables two-factor", async ({ page, freshUser }) => {
  await openOtpStep(page);
  await page.route("**/user/profile/2fa", (route) =>
    route.fulfill(json(200, ok)),
  );

  await otpInput(page).fill("123456");
  await twoFactorPassword(page).fill(freshUser.password);
  const request = page.waitForRequest("**/user/profile/2fa");
  await confirm(page).click();

  expect((await request).postDataJSON()).toEqual({
    phone: "+380501234567",
    code: "123456",
    twoFactorEnabled: true,
    currentPassword: freshUser.password,
  });
  await expect(otpInput(page)).toHaveCount(0);
  await expect(page.getByText("+380501234567")).toBeVisible();
});

// Fixed in wave 1 (FIX.md "2FA: неверный код считается успешным"): the API answers 400
// USER_INVALID_OTP, the hook keeps the OTP step and shows the error.
test("2FA: rejected code does not enable two-factor and shows an error", async ({
  page,
  freshUser,
}) => {
  await openOtpStep(page);
  await page.route("**/user/profile/2fa", (route) =>
    route.fulfill(
      json(400, {
        statusCode: 400,
        message: "Invalid or expired code",
        error: "Bad Request",
        code: "USER_INVALID_OTP",
      }),
    ),
  );

  await otpInput(page).fill("000000");
  await twoFactorPassword(page).fill(freshUser.password);
  await confirm(page).click();

  await expect(page.getByText("Invalid or expired code")).toBeVisible();
  await expect(otpInput(page)).toBeVisible();
  await expect(page.getByText(/enabled|увімкнено/i)).toHaveCount(0);
});

test("2FA: a 200 answer without {success: true} is not treated as success", async ({
  page,
  freshUser,
}) => {
  await openOtpStep(page);
  await page.route("**/user/profile/2fa", (route) =>
    route.fulfill(json(200, {})),
  );

  await otpInput(page).fill("123456");
  await twoFactorPassword(page).fill(freshUser.password);
  await confirm(page).click();

  await expect(
    page.getByText("Something went wrong, please try again"),
  ).toBeVisible();
  await expect(otpInput(page)).toBeVisible();
});

test("2FA: SMS rate limit (429) shows a message and stays on the phone step", async ({
  page,
}) => {
  const phone = await openPhoneStep(page);
  await page.route("**/sender/sms/send", (route) =>
    route.fulfill(
      json(429, {
        statusCode: 429,
        message: "Too many SMS requests",
        error: "Too Many Requests",
        code: "RATE_LIMITED",
      }),
    ),
  );
  await phone.fill("+380501234567");

  await sendCode(page).click();

  await expect(
    page.getByText("Too many attempts, please try again later"),
  ).toBeVisible();
  await expect(otpInput(page)).toHaveCount(0);
  await expect(phone).toBeVisible();
});
