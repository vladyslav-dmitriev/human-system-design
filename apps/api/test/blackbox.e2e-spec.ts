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
      ['POST', '/user/profile/2fa'],
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
      ['GET', '/billing/products/sync'],
    ])('%s %s -> 401 with Nest error body', async (method, path) => {
      const res = await call(method, path, {
        body: method === 'GET' ? undefined : {},
      });
      expect(res.status).toBe(401);
      expect(res.json).toMatchObject({
        statusCode: 401,
        error: 'Unauthorized',
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
      [
        '/sender/sms/send',
        { phoneNumber: '+380501234567', captchaToken: 'bogus' },
      ],
    ])('POST %s with a bogus captcha -> 403', async (path, body) => {
      const res = await call('POST', path, { body });
      expect(res.status).toBe(403);
      expect(res.json).toMatchObject({
        statusCode: 403,
        message: 'Invalid captcha token',
      });
    });

    it('POST /service-auth/verify-otp is rate limited (3/min): 429 appears after the limit', async () => {
      const statuses: number[] = [];
      for (let i = 0; i < 5; i++) {
        statuses.push(
          (
            await call('POST', '/service-auth/verify-otp', {
              body: {
                email: 'qa-bb@example.test',
                password: 'x',
                code: '000000',
                captchaToken: 'bogus',
              },
            })
          ).status,
        );
      }
      expect(statuses).toContain(429);
      statuses.filter((s) => s !== 429).forEach((s) => expect(s).toBe(403));
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

    // BUG: новый, см. отчёт L2 (глобальный ClassSerializerInterceptor excludeAll обнуляет ответ без @Serialize: /health отдаёт {})
    it.failing('GET /health returns {status:"ok", redis:"up"}', async () => {
      const res = await call('GET', '/health');
      expect(res.status).toBe(200);
      expect(res.json).toMatchObject({ status: 'ok', redis: 'up' });
    });

    // BUG: новый, см. отчёт L2 (GET /api/metrics без аутентификации доступен снаружи через nginx)
    it.failing('GET /metrics is not publicly readable', async () => {
      const res = await call('GET', '/metrics');
      expect([401, 403, 404]).toContain(res.status);
    });

    // BUG: см. FIX.md «verify-email подтверждает почту без проверки токена»
    it.failing(
      'GET /sender/emails/verify-email with a random token -> 400',
      async () => {
        const res = await call(
          'GET',
          '/sender/emails/verify-email?token=qa-not-a-real-token',
        );
        expect(res.status).toBe(400);
      },
    );

    // BUG: новый, см. отчёт L2 (неверные креды -> 201 с телом {} вместо 401)
    it.failing(
      'POST /service-auth/validate with wrong credentials -> 401',
      async () => {
        const res = await call('POST', '/service-auth/validate', {
          body: { email: 'qa-nobody@example.test', password: 'wrong' },
        });
        expect(res.status).toBe(401);
      },
    );

    // BUG: новый, см. отчёт L2 (docker compose запускает api через tsx: нет design:paramtypes, ValidationPipe молча не валидирует DTO; в Nest testing module с tsc-метаданными те же запросы дают 400)
    it.failing(
      'POST /service-auth/validate: invalid DTO -> 400 with message list',
      async () => {
        const res = await call('POST', '/service-auth/validate', {
          body: { email: 1 },
        });
        expect(res.status).toBe(400);
        expect(res.json.message).toEqual(
          expect.arrayContaining([expect.stringContaining('password')]),
        );
      },
    );

    // BUG: новый, см. тот же пункт отчёта L2 (ValidationPipe не работает под tsx)
    it.failing(
      'POST /sender/emails/send-verification: invalid DTO -> 400 (no mail is sent)',
      async () => {
        const res = await call('POST', '/sender/emails/send-verification', {
          body: { email: 'not-an-email', token: 't' },
        });
        expect(res.status).toBe(400);
      },
    );
  });

  describe('Swagger (/docs-json) vs apps/web/api.ts', () => {
    it('every URL used by web exists in the OpenAPI document', async () => {
      const res = await call('GET', '/docs-json');
      expect(res.status).toBe(200);
      const paths = Object.keys(res.json.paths);
      for (const p of [
        '/service-auth/register',
        '/service-auth/login',
        '/service-auth/validate',
        '/service-auth/verify-otp',
        '/user/profile',
        '/user/profile/password',
        '/user/profile/2fa',
        '/sender/sms/send',
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

    // BUG: новый, см. отчёт L2 (Swagger описывает только todos/upload-image: у остальных нет @ApiBody/@ApiResponse/@ApiCookieAuth)
    it.failing(
      'every protected operation declares security and 401',
      async () => {
        const res = await call('GET', '/docs-json');
        const undocumented: string[] = [];
        for (const [path, ops] of Object.entries<any>(res.json.paths)) {
          for (const [method, op] of Object.entries<any>(ops)) {
            if (
              path.startsWith('/health') ||
              path.startsWith('/metrics') ||
              path.startsWith('/service-auth') ||
              path.startsWith('/sender') ||
              path.endsWith('/webhook')
            )
              continue;
            if (!op.security || !op.responses['401'])
              undocumented.push(`${method} ${path}`);
          }
        }
        expect(undocumented).toEqual([]);
      },
    );
  });
});
