/** Обработанные события Stripe помним неделю: дольше Stripe их не переотправляет (ретраи до 3 суток). */
export const WEBHOOK_EVENT_TTL_SECONDS = 7 * 24 * 60 * 60;

export const webhookEventKey = (eventId: string) =>
  `stripe-webhook-event:${eventId}`;

/** Данные задачи в `payment-queue`. */
export type PaymentJobData<T = unknown> = {
  eventId: string;
  object: T;
};
