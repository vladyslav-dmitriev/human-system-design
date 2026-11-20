// Типы ресурсов Stripe. В stripe v22 CJS-точка входа экспортирует только
// конструктор, а пространство имён с типами (Customer, Price, Event...) лежит
// в stripe.core. Импорт только типовой, в рантайм не попадает.
export type { Stripe as StripeTypes } from 'stripe/cjs/stripe.core';
