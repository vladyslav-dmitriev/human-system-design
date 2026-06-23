export const QUEUE = {
  EmailQueue: 'email-queue',
  PdfQueue: 'pdf-queue',
  PaymentQueue: 'payment-queue',
} as const;

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
    OneTimePurchase: 'one-time-purchase',
  },
} as const;
