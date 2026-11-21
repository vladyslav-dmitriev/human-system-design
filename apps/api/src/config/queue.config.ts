import type { DefaultJobOptions } from 'bullmq';

import { getRedisUrl } from './redis.config';

export const QUEUE = {
  EmailQueue: 'email-queue',
  PdfQueue: 'pdf-queue',
  PaymentQueue: 'payment-queue',
} as const;

export type QueueName = (typeof QUEUE)[keyof typeof QUEUE];

export const QUEUE_JOB = {
  [QUEUE.EmailQueue]: {
    SendVerificationEmail: 'send-verification-email',
    SendInvoiceEmail: 'send-invoice-email',
  },
  [QUEUE.PdfQueue]: {
    CreatePdfInvoice: 'create-pdf-invoice',
  },
  [QUEUE.PaymentQueue]: {
    SubscriptionPurchase: 'subscription-purchase',
    SubscriptionUpgrade: 'subscription-upgrade',
    SubscriptionSync: 'subscription-sync',
    OneTimePurchase: 'one-time-purchase',
  },
} as const;

/** Повторы с экспоненциальной паузой (5 с, 10 с, 20 с, 40 с); неудавшиеся задачи хранятся сутки для разбора. */
export const DEFAULT_JOB_OPTIONS: DefaultJobOptions = {
  attempts: 5,
  backoff: { type: 'exponential', delay: 5000 },
  removeOnComplete: { count: 100, age: 3600 },
  removeOnFail: { count: 500, age: 7 * 24 * 3600 },
};

/**
 * Подключение BullMQ к Redis из REDIS_URL (`redis://[user:pass@]host:port[/db]`, `rediss://` = TLS).
 * `maxRetriesPerRequest: null` нужен воркерам BullMQ.
 */
export const getBullConnection = (url: string = getRedisUrl()) => {
  const parsed = new URL(url);
  const db = parsed.pathname.replace('/', '');

  return {
    host: parsed.hostname,
    port: parsed.port ? Number(parsed.port) : 6379,
    username: parsed.username ? decodeURIComponent(parsed.username) : undefined,
    password: parsed.password ? decodeURIComponent(parsed.password) : undefined,
    db: db ? Number(db) : undefined,
    ...(parsed.protocol === 'rediss:' ? { tls: {} } : {}),
    maxRetriesPerRequest: null,
  };
};
