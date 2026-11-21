import 'reflect-metadata';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { RequestMethod } from '@nestjs/common';
import { METHOD_METADATA, PATH_METADATA } from '@nestjs/common/constants';

import { AuthController } from '../src/modules/auth/auth.controller';
import { UsersController } from '../src/modules/user/users.controller';
import { TodosController } from '../src/modules/todo/todos.controller';
import { SmsController } from '../src/modules/sender/sms/sms.controller';
import { EmailsController } from '../src/modules/sender/email/emails.controller';
import { FinanceController } from '../src/modules/billing/finance/finance.controller';
import { PaymentMethodsController } from '../src/modules/billing/payment-method/payment-methods.controller';
import { SubscriptionsController } from '../src/modules/billing/subscription/subscriptions.controller';
import { InvoicesController } from '../src/modules/billing/invoice/invoices.controller';
import { ProductController } from '../src/modules/billing/product/products.controller';
import { MetricsController } from '../src/modules/metrics/metrics.controller';
import { AppController } from '../src/modules/app.controller';

const CONTROLLERS = [
  AuthController,
  UsersController,
  TodosController,
  SmsController,
  EmailsController,
  FinanceController,
  PaymentMethodsController,
  SubscriptionsController,
  InvoicesController,
  ProductController,
  MetricsController,
  AppController,
];

const norm = (p: string) => '/' + p.split('/').filter(Boolean).join('/');

/** Все маршруты Nest как "METHOD /path/:param" из метаданных декораторов. */
function nestRoutes(): string[] {
  const routes: string[] = [];
  for (const ctrl of CONTROLLERS) {
    const base: string = Reflect.getMetadata(PATH_METADATA, ctrl);
    for (const key of Object.getOwnPropertyNames(ctrl.prototype)) {
      const handler = ctrl.prototype[key];
      const method = Reflect.getMetadata(METHOD_METADATA, handler);
      if (method === undefined) continue;
      const path: string = Reflect.getMetadata(PATH_METADATA, handler);
      routes.push(
        `${RequestMethod[method]} ${norm(`${base}/${path}`).replace(/:\w+/g, ':param')}`,
      );
    }
  }
  return routes.sort();
}

/** Пути из apps/web/api.ts: `${process.env.X}/a/${id}?q` -> "/a/:param". */
function webPaths(): Record<string, string> {
  const src = readFileSync(join(__dirname, '../../web/api.ts'), 'utf8');
  const groups = [...src.matchAll(/^ {2}(\w+): \{/gm)].map((m) => ({
    name: m[1],
    at: m.index ?? 0,
  }));
  const entry =
    /(\w+):\s*\([^)]*\)\s*=>\s*`\$\{process\.env\.NEXT_PUBLIC_API_(?:CLIENT|SERVER)_URL\}([^`]+)`/g;
  const out: Record<string, string> = {};
  for (const m of src.matchAll(entry)) {
    const group = [...groups]
      .reverse()
      .find((g) => g.at < (m.index ?? 0))?.name;
    out[`${group}.${m[1]}`] = norm(
      m[2].split('?')[0].replace(/\$\{[^}]+\}/g, ':param'),
    );
  }
  return out;
}

/**
 * Метод, с которым web реально вызывает каждый URL (см. места вызова в apps/web:
 * features/*, widgets/*, app/[locale]/(app)/*, utils.ts, auth.ts). Таблица ведётся вручную.
 */
const WEB_METHOD: Record<string, string[]> = {
  'auth.createAccount': ['POST'],
  'auth.login': ['POST'],
  'auth.validate': ['POST'],
  'auth.twoFactor': ['POST'],
  'users.profile': ['GET'],
  'users.email': ['PATCH'],
  'users.password': ['PATCH'],
  'users.phone': ['PUT'],
  'users.setTwoFactor': ['POST'],
  'sms.sendSmsCode': ['POST'],
  'billing.userBilling': ['GET'],
  'billing.paymentMethods': ['GET'],
  'billing.paymentMethodsClient': ['GET'],
  'billing.paymentMethodsById': ['POST', 'DELETE'],
  'billing.products': ['GET'],
  'billing.syncProducts': ['POST'],
  'billing.subscriptionsUpgrade': ['POST'],
  'billing.subscriptionsRenew': ['POST'],
  'billing.checkout': ['POST'],
  'billing.paymentIntentCreate': ['GET'],
  'billing.createPortalSession': ['POST'],
  'billing.invoices': ['GET'],
  'emails.sendVerification': ['POST'],
  'emails.verifyEmail': ['GET'],
  'todos.list': ['GET'],
  'todos.create': ['POST'],
  'todos.edit': ['PATCH'],
  'todos.delete': ['DELETE'],
  'todos.uploadImage': ['POST'],
};

describe('contract: apps/web/api.ts vs Nest controllers', () => {
  const routes = nestRoutes();
  const web = webPaths();

  it('parser sees every entry of API_URL', () => {
    expect(Object.keys(web).sort()).toEqual(Object.keys(WEB_METHOD).sort());
  });

  it('every web URL (method + path) exists in Nest', () => {
    const missing = Object.entries(web)
      .filter(
        ([key, path]) =>
          !WEB_METHOD[key].every((m) => routes.includes(`${m} ${path}`)),
      )
      .map(([key]) => key)
      .sort();
    expect(missing).toEqual([]);
  });

  it('Nest routes that web never calls (dead / server-to-server) are exactly the known set', () => {
    const used = new Set(
      Object.entries(web).flatMap(([key, path]) =>
        WEB_METHOD[key].map((m) => `${m} ${path}`),
      ),
    );
    const unused = routes.filter((r) => !used.has(r));
    expect(unused).toEqual([
      'GET /health',
      'GET /metrics',
      'POST /billing/webhook', // Stripe -> api, web не вызывает
    ]);
  });

  it('web paths sanity: id params map to :param', () => {
    expect(web['todos.edit']).toBe('/todos/:param');
    expect(web['billing.paymentMethodsById']).toBe(
      '/billing/payment-methods/:param',
    );
  });
});

describe('contract: Swagger metadata of protected routes', () => {
  const GUARDS_METADATA = '__guards__';
  const hasAuthGuard = (target: object) =>
    (Reflect.getMetadata(GUARDS_METADATA, target) ?? []).some(
      (g: { name?: string }) => g?.name === 'AuthGuard',
    );
  const responses = (target: object) =>
    (Reflect.getMetadata('swagger/apiResponse', target) ?? {}) as Record<
      string,
      unknown
    >;

  /** Защищённые AuthGuard операции без декларации cookie-аутентификации и ответа 401. */
  function undocumented() {
    const out: string[] = [];

    for (const ctrl of CONTROLLERS) {
      for (const key of Object.getOwnPropertyNames(ctrl.prototype)) {
        const handler = ctrl.prototype[key];

        if (Reflect.getMetadata(METHOD_METADATA, handler) === undefined)
          continue;
        if (!hasAuthGuard(ctrl) && !hasAuthGuard(handler)) continue;

        const security =
          Reflect.getMetadata('swagger/apiSecurity', handler) ??
          Reflect.getMetadata('swagger/apiSecurity', ctrl);
        const has401 = '401' in responses(handler) || '401' in responses(ctrl);

        if (!security || !has401) out.push(`${ctrl.name}.${key}`);
      }
    }

    return out;
  }

  // BUG: волна 1, backend: у TodosController.{getUserTodos,createTodo,updateTodo,deleteTodo} нет
  // @ApiUnauthorizedResponse / @ApiResponse({status: 401}) (есть только у upload-image). Минорно, документация.
  it.failing(
    'every route behind AuthGuard declares cookie security and a 401 response',
    () => {
      expect(undocumented()).toEqual([]);
    },
  );
});
