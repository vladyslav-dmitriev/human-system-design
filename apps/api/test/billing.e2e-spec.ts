/* eslint-disable @typescript-eslint/require-await, @typescript-eslint/no-unnecessary-type-assertion */
import request from 'supertest';
import type { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { PaymentMethodsController } from '../src/modules/billing/payment-method/payment-methods.controller';
import { PaymentMethodService } from '../src/modules/billing/payment-method/payment-method.service';
import { PaymentMethodRepository } from '../src/modules/billing/payment-method/payment-method.repository';
import { SubscriptionsController } from '../src/modules/billing/subscription/subscriptions.controller';
import { SubscriptionService } from '../src/modules/billing/subscription/subscription.service';
import { SubscriptionRepository } from '../src/modules/billing/subscription/subscription.repository';
import { InvoicesController } from '../src/modules/billing/invoice/invoices.controller';
import { InvoiceService } from '../src/modules/billing/invoice/invoice.service';
import { ProductController } from '../src/modules/billing/product/products.controller';
import { ProductService } from '../src/modules/billing/product/product.service';
import { FinanceController } from '../src/modules/billing/finance/finance.controller';
import { FinanceService } from '../src/modules/billing/finance/finance.service';
import { FinanceRepository } from '../src/modules/billing/finance/finance.repository';
import { WebhookService } from '../src/modules/billing/finance/webhooks/webhook.service';
import { PaymentHandler } from '../src/modules/billing/finance/webhooks/payment.handler';
import { PaymentsService } from '../src/modules/billing/payments/payments.service';
import { StripeProvider } from '../src/modules/billing/payments/providers/stripe.provider';
import { UserRepository } from '../src/modules/user/user.repository';
import { AuthGuard } from '../src/modules/auth/guards/jwt-auth.guard';
import { createTestApp, sessionCookie, USER_A, USER_B } from './helpers/app';

const CUS: Record<string, string> = {
  [USER_A.id]: 'cus_A',
  [USER_B.id]: 'cus_B',
};
const WEBHOOK_SECRET = 'whsec_test_secret_for_e2e_only';

/** In-memory Stripe: никакой сети. Привязка payment method -> customer хранится в `owners`. */
function createFakeStripe() {
  const owners = new Map<string, string | null>([
    ['pm_A', 'cus_A'],
    ['pm_B', 'cus_B'],
    ['pm_free', null],
  ]);
  const subs = new Map<
    string,
    {
      id: string;
      customer: string;
      cancel_at_period_end: boolean;
      items: { data: { id: string }[] };
    }
  >([
    [
      'sub_A',
      {
        id: 'sub_A',
        customer: 'cus_A',
        cancel_at_period_end: false,
        items: { data: [{ id: 'si_A' }] },
      },
    ],
    [
      'sub_B',
      {
        id: 'sub_B',
        customer: 'cus_B',
        cancel_at_period_end: false,
        items: { data: [{ id: 'si_B' }] },
      },
    ],
  ]);
  const intents = new Map<string, any>([
    [
      'pi_B',
      {
        id: 'pi_B',
        status: 'succeeded',
        amount: 4900,
        currency: 'usd',
        customer: 'cus_B',
        metadata: { name: 'B-secret-product', type: 'one_time' },
      },
    ],
    [
      'pi_pending',
      {
        id: 'pi_pending',
        status: 'requires_payment_method',
        amount: 100,
        currency: 'usd',
        customer: 'cus_A',
        metadata: {},
      },
    ],
  ]);

  return {
    owners,
    subs,
    paymentMethods: {
      list: jest.fn(async ({ customer }: { customer: string }) => ({
        data: [...owners]
          .filter(([, c]) => c === customer)
          .map(([id]) => ({
            id,
            card: {
              brand: 'visa',
              last4: '4242',
              exp_month: 12,
              exp_year: 2030,
            },
          })),
      })),
      attach: jest.fn(
        async (pm: string, { customer }: { customer: string }) => {
          const current = owners.get(pm);
          if (current && current !== customer)
            throw new Error(
              'The payment method you provided has already been attached to a customer.',
            );
          if (!owners.has(pm))
            throw new Error(`No such PaymentMethod: '${pm}'`);
          owners.set(pm, customer);
          return { id: pm };
        },
      ),
      // как у настоящего Stripe: detach работает по id, владельца не проверяет
      detach: jest.fn(async (pm: string) => {
        owners.set(pm, null);
        return { id: pm };
      }),
    },
    customers: {
      create: jest.fn(async () => ({ id: 'cus_new' })),
      update: jest.fn(async () => ({})),
    },
    subscriptions: {
      retrieve: jest.fn(async (id: string) => subs.get(id)),
      update: jest.fn(
        async (id: string, data: { cancel_at_period_end: boolean }) => {
          subs.get(id)!.cancel_at_period_end = data.cancel_at_period_end;
          return subs.get(id);
        },
      ),
    },
    prices: {
      retrieve: jest.fn(async (id: string) => ({
        id,
        unit_amount: 1000,
        currency: 'usd',
        product: { id: 'prod_1', name: 'Premium' },
      })),
      list: jest.fn(async () => ({ data: [] })),
    },
    paymentIntents: {
      retrieve: jest.fn(async (id: string) => {
        const pi = intents.get(id);
        if (!pi) throw new Error(`No such payment_intent: '${id}'`);
        return pi;
      }),
      create: jest.fn(async () => ({
        id: 'pi_new',
        client_secret: 'pi_new_secret_x',
      })),
    },
    invoices: {
      createPreview: jest.fn(async () => ({
        amount_due: 500,
        currency: 'usd',
        customer: 'cus_A',
      })),
    },
    webhooks: undefined as any,
  };
}

describe('Billing controllers (nest testing module, fake Stripe, mocked repos)', () => {
  let app: INestApplication;
  let stripe: ReturnType<typeof createFakeStripe>;
  let cookieA: string;
  let cookieB: string;
  const productService = { getProducts: jest.fn(), syncProducts: jest.fn() };
  const invoiceRepo = { getUserInvoiceList: jest.fn() };
  const paymentHandler = {
    handleSubscriptionPurchase: jest.fn(),
    handleSubscriptionUpgrade: jest.fn(),
    handleOneTimePurchase: jest.fn(),
  };
  const subRepo = { changeAutoRenew: jest.fn() };

  beforeAll(async () => {
    cookieA = await sessionCookie(USER_A);
    cookieB = await sessionCookie(USER_B);
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
    jest.spyOn(console, 'log').mockImplementation(() => undefined);
  });

  beforeEach(async () => {
    stripe = createFakeStripe();
    Object.values(paymentHandler).forEach((m) =>
      m.mockReset().mockResolvedValue(undefined),
    );
    productService.getProducts
      .mockReset()
      .mockResolvedValue({ recurring: [], oneTime: [] });
    productService.syncProducts.mockReset().mockResolvedValue(undefined);
    invoiceRepo.getUserInvoiceList
      .mockReset()
      .mockImplementation(async (userId: string) => [
        {
          id: `inv-${userId}`,
          number: 'INV-1',
          amount: 100,
          currency: 'usd',
          status: 'paid',
          pdfUrl: '',
          createdAt: new Date(),
          userId,
        },
      ]);
    subRepo.changeAutoRenew.mockReset().mockResolvedValue(undefined);

    const userRepo = {
      getUserById: jest.fn(async (id: string) =>
        CUS[id]
          ? {
              id,
              email: `${id}@example.test`,
              userBillingProfile: {
                stripeCustomerId: CUS[id],
                defaultPaymentMethodId: id === USER_A.id ? 'pm_A' : 'pm_B',
              },
              subscription: {
                stripeSubscriptionId: id === USER_A.id ? 'sub_A' : null,
              },
            }
          : null,
      ),
    };
    const financeRepo = {
      getUserBilling: jest.fn(async (id: string) => ({
        userBillingProfile: {
          stripeCustomerId: CUS[id],
          defaultPaymentMethodId: `pm_${id.slice(-1).toUpperCase()}`,
          currency: 'usd',
          taxId: null,
        },
        subscription: {
          stripeSubscriptionId: id === USER_A.id ? 'sub_A' : null,
          status: 'active',
          autoRenew: true,
          currentPeriodEnd: null,
          stripePriceId: 'price_1',
        },
        features: [],
      })),
      createUserBilling: jest.fn(),
    };
    const config = new Map<string, string>([
      ['STRIPE_SECRET_KEY', 'sk_test_e2e_not_real'],
      ['STRIPE_WEBHOOK_SECRET', WEBHOOK_SECRET],
      ['CLIENT_URL', 'http://client.example.test'],
    ]);

    app = await createTestApp({
      controllers: [
        PaymentMethodsController,
        SubscriptionsController,
        InvoicesController,
        ProductController,
        FinanceController,
      ],
      providers: [
        AuthGuard,
        PaymentsService,
        { provide: 'PAYMENT_PROVIDER', useClass: StripeProvider },
        {
          provide: ConfigService,
          useValue: { get: (k: string) => config.get(k) },
        },
        PaymentMethodService,
        FinanceService,
        SubscriptionService,
        InvoiceService,
        WebhookService,
        { provide: PaymentHandler, useValue: paymentHandler },
        { provide: ProductService, useValue: productService },
        { provide: UserRepository, useValue: userRepo },
        { provide: FinanceRepository, useValue: financeRepo },
        {
          provide: PaymentMethodRepository,
          useValue: { updateDefaultPaymentMethod: jest.fn() },
        },
        { provide: SubscriptionRepository, useValue: subRepo },
        { provide: 'InvoiceRepository', useValue: invoiceRepo },
        {
          provide: (
            await import('../src/modules/billing/invoice/invoice.repository')
          ).InvoiceRepository,
          useValue: invoiceRepo,
        },
      ],
    });
    // подмена сетевого клиента Stripe в настоящем провайдере (ключи тестовые, сети нет)
    const provider = app.get('PAYMENT_PROVIDER') as any;
    const real = provider.stripe;
    stripe.webhooks = real.webhooks;
    provider.stripe = stripe;
  });

  afterEach(() => app.close());

  const http = () => request(app.getHttpServer());

  describe('401 without a session', () => {
    it.each([
      ['get', '/billing/user'],
      ['post', '/billing/create-portal-session'],
      ['post', '/billing/checkout'],
      ['get', '/billing/payment-intents/pi_B'],
      ['get', '/billing/invoices'],
      ['post', '/billing/subscriptions/renew'],
      ['post', '/billing/subscriptions/upgrade'],
      ['get', '/billing/payment-methods'],
      ['post', '/billing/payment-methods/pm_A'],
      ['delete', '/billing/payment-methods/pm_A'],
      ['get', '/billing/products'],
      ['get', '/billing/products/sync'],
    ])('%s %s -> 401', async (method, url) => {
      const res = await (http() as any)[method](url).send({}).expect(401);
      expect(res.body.statusCode).toBe(401);
    });
  });

  describe('payment methods', () => {
    it('lists only the caller cards', async () => {
      const res = await http()
        .get('/billing/payment-methods')
        .set('Cookie', cookieA)
        .expect(200);
      expect(res.body.map((p: any) => p.id)).toEqual(['pm_A']);
      expect(res.body[0]).toEqual({
        id: 'pm_A',
        brand: 'visa',
        last4: '4242',
        expMonth: 12,
        expYear: 2030,
        isDefault: true,
      });
    });

    it('add: free payment method is attached to the caller', async () => {
      await http()
        .post('/billing/payment-methods/pm_free')
        .set('Cookie', cookieA)
        .expect(201);
      expect(stripe.owners.get('pm_free')).toBe('cus_A');
    });

    it('add: card of another customer cannot be attached (Stripe refuses) -> 400', async () => {
      const res = await http()
        .post('/billing/payment-methods/pm_B')
        .set('Cookie', cookieA)
        .expect(400);
      expect(res.body.message).toContain('Stripe Attach Error');
      expect(stripe.owners.get('pm_B')).toBe('cus_B');
    });

    it('delete: own card is detached', async () => {
      await http()
        .delete('/billing/payment-methods/pm_A')
        .set('Cookie', cookieA)
        .expect(200);
      expect(stripe.owners.get('pm_A')).toBeNull();
    });

    // BUG: новый, см. отчёт L2 (IDOR: deletePaymentMethod игнорирует customer и делает paymentMethods.detach(id) для любого id)
    it.failing('IDOR: user A cannot detach the card of user B', async () => {
      const res = await http()
        .delete('/billing/payment-methods/pm_B')
        .set('Cookie', cookieA);
      expect([403, 404]).toContain(res.status);
      expect(stripe.owners.get('pm_B')).toBe('cus_B');
    });

    it('error responses use the unified Nest format {statusCode,message,error}', async () => {
      const res = await http()
        .post('/billing/payment-methods/pm_B')
        .set('Cookie', cookieA)
        .expect(400);
      expect(Object.keys(res.body).sort()).toEqual([
        'error',
        'message',
        'statusCode',
      ]);
    });

    // BUG: новый, см. отчёт L2 (текст ошибки Stripe SDK уходит клиенту как есть: `Stripe Attach Error: Error: ...`)
    it.failing(
      'does not echo raw Stripe SDK error text to the client',
      async () => {
        const res = await http()
          .post('/billing/payment-methods/pm_B')
          .set('Cookie', cookieA)
          .expect(400);
        expect(res.body.message).not.toMatch(/Error: /);
      },
    );
  });

  describe('subscriptions', () => {
    const renew = (cookie: string, body: any) =>
      http()
        .post('/billing/subscriptions/renew')
        .set('Cookie', cookie)
        .send(body);

    it('cancel (autoRenew=false) updates only the caller subscription', async () => {
      const res = await renew(cookieA, { autoRenew: false }).expect(201);
      expect(res.body).toEqual({ success: true, autoRenew: false });
      expect(stripe.subs.get('sub_A')!.cancel_at_period_end).toBe(true);
      expect(stripe.subs.get('sub_B')!.cancel_at_period_end).toBe(false);
    });

    it('double cancel (sequential and parallel) is idempotent', async () => {
      await renew(cookieA, { autoRenew: false }).expect(201);
      await renew(cookieA, { autoRenew: false }).expect(201);
      const results = await Promise.all([
        renew(cookieA, { autoRenew: false }),
        renew(cookieA, { autoRenew: false }),
      ]);
      results.forEach((r) => expect(r.status).toBe(201));
      expect(stripe.subs.get('sub_A')!.cancel_at_period_end).toBe(true);
    });

    it('user without subscription -> 404', async () => {
      await renew(cookieB, { autoRenew: false }).expect(404);
    });

    it('IDOR: stripeSubscriptionId in body is rejected by whitelist', async () => {
      const res = await renew(cookieB, {
        autoRenew: false,
        stripeSubscriptionId: 'sub_A',
      }).expect(400);
      expect(res.body.message).toContain(
        'property stripeSubscriptionId should not exist',
      );
      expect(stripe.subs.get('sub_A')!.cancel_at_period_end).toBe(false);
    });

    it.each([
      [{}],
      [{ autoRenew: 'false' }],
      [{ autoRenew: 0 }],
      [{ autoRenew: null }],
    ])('renew invalid body %j -> 400', async (body) => {
      await renew(cookieA, body).expect(400);
    });

    it('upgrade type=check returns a quote without clientSecret', async () => {
      const res = await http()
        .post('/billing/subscriptions/upgrade')
        .set('Cookie', cookieA)
        .send({ type: 'check', priceId: 'price_2' })
        .expect(201);
      expect(res.body).toEqual({
        clientSecret: null,
        amount: 500,
        currency: 'usd',
        productName: 'Premium',
      });
    });

    it.each([
      [{ type: 'check' }],
      [{ priceId: 'p' }],
      [{ type: 'other', priceId: 'p' }],
      [{ type: 'check', priceId: '' }],
    ])('upgrade invalid body %j -> 400', async (body) => {
      await http()
        .post('/billing/subscriptions/upgrade')
        .set('Cookie', cookieA)
        .send(body)
        .expect(400);
    });

    // BUG: новый, см. отчёт L2 (контракт: web checkout/page.tsx шлёт type:"payment", API принимает только subscription|check)
    it.failing(
      'upgrade accepts type "payment" as web checkout page sends it',
      async () => {
        await http()
          .post('/billing/subscriptions/upgrade')
          .set('Cookie', cookieA)
          .send({ type: 'payment', priceId: 'price_2' })
          .expect(201);
      },
    );
  });

  describe('invoices', () => {
    it('returns only the caller invoices', async () => {
      const res = await http()
        .get('/billing/invoices')
        .set('Cookie', cookieA)
        .expect(200);
      expect(invoiceRepo.getUserInvoiceList).toHaveBeenCalledWith(USER_A.id);
      expect(res.body).toHaveLength(1);
      expect(res.body[0].id).toBe(`inv-${USER_A.id}`);
      expect(res.body[0].userId).toBeUndefined();
    });
  });

  describe('products', () => {
    it('GET /billing/products -> 200 for any authenticated user', async () => {
      const res = await http()
        .get('/billing/products')
        .set('Cookie', cookieA)
        .expect(200);
      expect(res.body).toEqual({ recurring: [], oneTime: [] });
    });

    // BUG: новый, см. отчёт L2 (GET /billing/products/sync доступен любому пользователю; пишет в БД, дёргает Stripe, состояние меняет GET)
    it.failing('products/sync is not available to a regular USER', async () => {
      const res = await http()
        .get('/billing/products/sync')
        .set('Cookie', cookieA);
      expect(res.status).toBe(403);
    });
  });

  describe('finance', () => {
    it('GET /billing/user returns the caller profile', async () => {
      const res = await http()
        .get('/billing/user')
        .set('Cookie', cookieA)
        .expect(200);
      expect(res.body.billing.stripeCustomerId).toBe('cus_A');
    });

    it('checkout validation: wrong type / missing priceId -> 400', async () => {
      await http()
        .post('/billing/checkout')
        .set('Cookie', cookieA)
        .send({ priceId: 'p', type: 'x' })
        .expect(400);
      await http()
        .post('/billing/checkout')
        .set('Cookie', cookieA)
        .send({ type: 'subscription' })
        .expect(400);
      await http()
        .post('/billing/checkout')
        .set('Cookie', cookieA)
        .send({ priceId: 'p', type: 'one-payment', amount: 1 })
        .expect(400);
    });

    it('checkout one-payment returns client secret, amount comes from Stripe price (not from client)', async () => {
      const res = await http()
        .post('/billing/checkout')
        .set('Cookie', cookieA)
        .send({ priceId: 'price_1', type: 'one-payment' })
        .expect(201);
      expect(res.body).toMatchObject({
        clientSecret: 'pi_new_secret_x',
        amount: 1000,
        currency: 'usd',
        productName: 'Premium',
      });
    });

    it('payment intent that is not succeeded -> 400', async () => {
      await http()
        .get('/billing/payment-intents/pi_pending')
        .set('Cookie', cookieA)
        .expect(400);
    });

    // BUG: новый, см. отчёт L2 (IDOR: GET payment-intents/:id не проверяет, что intent принадлежит caller; отдаёт чужие amount/customer/metadata)
    it.failing(
      'IDOR: user A cannot read payment intent of customer B',
      async () => {
        const res = await http()
          .get('/billing/payment-intents/pi_B')
          .set('Cookie', cookieA);
        expect([403, 404]).toContain(res.status);
      },
    );

    // BUG: новый, см. отчёт L2 (вложенный Metadata без @Expose: metadata.name/type обнуляются, /thank-you-payment не получает название товара)
    it.failing(
      'payment intent response keeps metadata.name / metadata.type',
      async () => {
        const res = await http()
          .get('/billing/payment-intents/pi_B')
          .set('Cookie', cookieB)
          .expect(200);
        expect(res.body.metadata).toMatchObject({
          name: 'B-secret-product',
          type: 'one_time',
        });
      },
    );
  });

  describe('POST /billing/webhook (Stripe signature)', () => {
    const payload = JSON.stringify({
      id: 'evt_1',
      object: 'event',
      type: 'payment_intent.succeeded',
      data: { object: { id: 'pi_1', metadata: { type: 'one_time' } } },
    });
    const sign = (body: string, secret = WEBHOOK_SECRET, timestamp?: number) =>
      stripe.webhooks.generateTestHeaderString({
        payload: body,
        secret,
        timestamp,
      });
    const send = (body: string, signature?: string) => {
      let req = http()
        .post('/billing/webhook')
        .set('Content-Type', 'application/json');
      if (signature !== undefined) req = req.set('stripe-signature', signature);
      return req.send(body);
    };

    it('no signature header -> 400', async () => {
      const res = await send(payload).expect(400);
      expect(res.body.message).toContain('Missing stripe-signature');
      expect(paymentHandler.handleOneTimePurchase).not.toHaveBeenCalled();
    });

    it('garbage signature -> 400, handler not called', async () => {
      await send(payload, 't=1,v1=bad').expect(400);
      expect(paymentHandler.handleOneTimePurchase).not.toHaveBeenCalled();
    });

    it('signature made with a wrong secret -> 400', async () => {
      await send(payload, sign(payload, 'whsec_other_secret')).expect(400);
    });

    it('valid signature but body tampered after signing -> 400', async () => {
      await send(payload.replace('pi_1', 'pi_2'), sign(payload)).expect(400);
    });

    it('stale timestamp (replay outside tolerance) -> 400', async () => {
      await send(
        payload,
        sign(payload, WEBHOOK_SECRET, Math.floor(Date.now() / 1000) - 3600),
      ).expect(400);
    });

    it('valid signature -> 200 and handler invoked', async () => {
      await send(payload, sign(payload)).expect(200);
      expect(paymentHandler.handleOneTimePurchase).toHaveBeenCalledTimes(1);
    });

    // BUG: см. FIX.md «Вебхуки Stripe ничего не делают» (нужна идемпотентность по event.id)
    it.failing('replay of the same event.id is processed once', async () => {
      const sig = sign(payload);
      await send(payload, sig).expect(200);
      await send(payload, sig).expect(200);
      expect(paymentHandler.handleOneTimePurchase).toHaveBeenCalledTimes(1);
    });

    // BUG: новый, см. отчёт L2 (400 на неверную подпись содержит полный текст исключения Stripe SDK)
    it.failing(
      'error message for a bad signature does not contain SDK internals',
      async () => {
        const res = await send(payload, 't=1,v1=bad').expect(400);
        expect(res.body.message).not.toMatch(/Error: |docs\.stripe\.com/);
      },
    );
  });
});
