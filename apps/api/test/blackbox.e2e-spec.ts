/**
 * Black-box тесты по HTTP против поднятого стека.
 * Запуск: API_E2E_URL=http://myapp.local/api pnpm --filter api test:e2e
 * Без API_E2E_URL блок пропускается.
 *
 * Без валидной капчи регистрация и логин недоступны (reCAPTCHA v3 проверяется у Google),
 * поэтому здесь проверяется всё, что не требует сессии: 401 / 403 / 400, вебхук, CORS, Swagger.
 * Каждый маршрут дёргается не чаще 1-3 раз: глобальный rate limit 10 запросов в минуту на маршрут.
 */
const BASE = process.env.API_E2E_URL?.replace(/\/$/, '');
const suite = BASE ? describe : describe.skip;

async function call(
  method: string,
  path: string,
  init: { body?: unknown; headers?: Record<string, string> } = {},
) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { 'content-type': 'application/json', ...init.headers },
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
  });
  const text = await res.text();
  let json: any;
  try {
    json = JSON.parse(text);
  } catch {
    json = undefined;
  }
  return { status: res.status, text, json, headers: res.headers };
}

suite('black-box API over HTTP', () => {
  describe('401 without a session cookie', () => {
    it.each([
      ['GET', '/user/profile'],
      ['PATCH', '/user/profile'],
      ['PATCH', '/user/profile/password'],
      ['PUT', '/user/profile/phone'],
      ['POST', '/user/profile/2fa'],
      ['POST', '/sender/sms/send'],
      ['POST', '/sender/emails/send-verification'],
      ['GET', '/todos'],
      ['POST', '/todos'],
      ['PATCH', '/todos/any-id'],
      ['DELETE', '/todos/any-id'],
      ['POST', '/todos/upload-image'],
      ['GET', '/billing/user'],
      ['POST', '/billing/create-portal-session'],
      ['POST', '/billing/checkout'],
      ['GET', '/billing/payment-intents/pi_x'],
      ['GET', '/billing/invoices'],
      ['POST', '/billing/subscriptions/renew'],
      ['POST', '/billing/subscriptions/upgrade'],
      ['GET', '/billing/payment-methods'],
      ['POST', '/billing/payment-methods/pm_x'],
      ['DELETE', '/billing/payment-methods/pm_x'],
      ['GET', '/billing/products'],
      ['POST', '/billing/products/sync'],
    ])('%s %s -> 401 with Nest error body', async (method, path) => {
      const res = await call(method, path, {
        body: method === 'GET' ? undefined : {},
      });
      expect(res.status).toBe(401);
      expect(res.json).toMatchObject({
        statusCode: 401,
        error: 'Unauthorized',
        code: 'UNAUTHORIZED',
      });
    });

    it('garbage and forged session cookies -> 401', async () => {
      const a = await call('GET', '/user/profile', {
        headers: { cookie: 'authjs.session-token=garbage' },
      });
      const b = await call('GET', '/user/profile', {
        headers: {
          cookie: '__Secure-authjs.session-token=eyJhbGciOiJkaXIifQ..x.y.z',
        },
      });
      expect(a.status).toBe(401);
      expect(b.status).toBe(401);
    });
  });

  describe('captcha-protected public endpoints', () => {
    it.each([
      [
        '/service-auth/register',
        {
          name: 'x',
          email: 'qa-bb@example.test',
          password: 'Passw0rd-qa',
          locale: 'en',
          captchaToken: 'bogus',
        },
      ],
      [
        '/service-auth/login',
        {
          email: 'qa-bb@example.test',
          password: 'Passw0rd-qa',
          captchaToken: 'bogus',
        },
      ],
    ])('POST %s with a bogus captcha -> 403', async (path, body) => {
      const res = await call('POST', path, { body });
      expect(res.status).toBe(403);
      expect(res.json).toMatchObject({
        statusCode: 403,
        message: 'Invalid captcha token',
      });
    });

    it('POST /service-auth/verify-otp: DTO is validated, no captcha needed, rate limited at 5/min', async () => {
      // 1-й запрос: невалидный DTO -> 400 со списком сообщений (ValidationPipe работает в рантайме стека)
      const invalid = await call('POST', '/service-auth/verify-otp', {
        body: { otpChallenge: 'short', code: 1 },
      });
      expect(invalid.status).toBe(400);
      expect(Array.isArray(invalid.json.message)).toBe(true);

      // 2-5: валидная форма, но челлендж не выдавался (шага с паролем не было) -> 400 AUTH_INVALID_OTP, а не 403 (капчи нет)
      for (let i = 0; i < 4; i++) {
        const res = await call('POST', '/service-auth/verify-otp', {
          body: { otpChallenge: 'x'.repeat(43), code: '000000' },
        });
        expect(res.status).toBe(400);
        expect(res.json).toMatchObject({ code: 'AUTH_INVALID_OTP' });
      }

      const limited = await call('POST', '/service-auth/verify-otp', {
        body: { otpChallenge: 'x'.repeat(43), code: '000000' },
      });
      expect(limited.status).toBe(429);
      expect(limited.json).toMatchObject({ code: 'RATE_LIMITED' });
    });
  });

  describe('POST /billing/webhook', () => {
    it('without signature -> 400', async () => {
      const res = await call('POST', '/billing/webhook', {
        body: { id: 'evt_x' },
      });
      expect(res.status).toBe(400);
      expect(res.json.message).toContain('Missing stripe-signature');
    });

    it('with a wrong signature -> 400', async () => {
      const res = await call('POST', '/billing/webhook', {
        body: { id: 'evt_x' },
        headers: { 'stripe-signature': 't=1,v1=deadbeef' },
      });
      expect(res.status).toBe(400);
    });
  });

  describe('public/unauthenticated surface', () => {
    it('unknown route -> 404 in Nest error format', async () => {
      const res = await call('GET', '/definitely/not/here');
      expect(res.status).toBe(404);
      expect(res.json).toMatchObject({ statusCode: 404 });
    });

    it('CORS: foreign origin does not get Access-Control-Allow-Origin', async () => {
      const res = await fetch(`${BASE}/health`, {
        headers: { Origin: 'http://evil.example.test' },
      });
      const allowed = res.headers.get('access-control-allow-origin');
      expect(allowed === null || allowed !== 'http://evil.example.test').toBe(
        true,
      );
    });

    it('GET /health returns {status:"ok", redis:"up"}', async () => {
      const res = await call('GET', '/health');
      expect(res.status).toBe(200);
      expect(res.json).toMatchObject({ status: 'ok', redis: 'up' });
    });

    it('GET /metrics is not publicly readable (closed by nginx or by flag)', async () => {
      const res = await call('GET', '/metrics');
      expect([401, 403, 404]).toContain(res.status);
    });

    it('GET /sender/emails/verify-email with a random token -> 400 EMAIL_TOKEN_INVALID', async () => {
      const res = await call(
        'GET',
        '/sender/emails/verify-email?token=qa-not-a-real-token',
      );
      expect(res.status).toBe(400);
      expect(res.json).toMatchObject({ code: 'EMAIL_TOKEN_INVALID' });
    });

    it('POST /service-auth/validate is not reachable from outside (nginx -> 404, api without X-Internal-Secret -> 401); the old {email,password} contract gives no user', async () => {
      const res = await call('POST', '/service-auth/validate', {
        body: { email: 'qa-nobody@example.test', password: 'wrong' },
      });
      // 404 за nginx; при прямом обращении к api (API_E2E_URL без nginx): 401, если задан
      // INTERNAL_API_SECRET (гард раньше валидатора), иначе 400 от валидатора
      expect([400, 401, 404]).toContain(res.status);
      expect(res.json?.user).toBeUndefined();
    });

    it('errors do not leak stack traces or Prisma text', async () => {
      const res = await call('DELETE', '/todos/does-not-exist');
      expect(res.status).toBe(401);
      expect(res.text).not.toMatch(/at .*\.(ts|js):\d+|Prisma|node_modules/);
    });
  });

  describe('Swagger (/docs-json) vs apps/web/api.ts', () => {
    it('is either closed (404: nginx / ENABLE_SWAGGER=false) or lists every URL used by web', async () => {
      const res = await call('GET', '/docs-json');
      if (res.status === 404) return;
      expect(res.status).toBe(200);
      const paths = Object.keys(res.json.paths);
      for (const p of [
        '/service-auth/register',
        '/service-auth/login',
        '/service-auth/validate',
        '/service-auth/verify-otp',
        '/user/profile',
        '/user/profile/password',
        '/user/profile/phone',
        '/user/profile/2fa',
        '/sender/sms/send',
        '/sender/emails/send-verification',
        '/sender/emails/verify-email',
        '/billing/user',
        '/billing/payment-methods',
        '/billing/payment-methods/{paymentMethodId}',
        '/billing/products',
        '/billing/products/sync',
        '/billing/subscriptions/upgrade',
        '/billing/subscriptions/renew',
        '/billing/checkout',
        '/billing/payment-intents/{paymentIntentId}',
        '/billing/create-portal-session',
        '/billing/invoices',
        '/todos',
        '/todos/{todoId}',
        '/todos/upload-image',
      ]) {
        expect(paths).toContain(p);
      }
    });
  });
});
