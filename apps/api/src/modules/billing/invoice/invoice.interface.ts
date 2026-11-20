import type { Prisma } from '@prisma/client';

export type Invoice = {
  id: string;
  number: string;
  stripePaymentIntentId: string;
  stripeCustomerId: string;
  userId: string;
  amount: number;
  currency: string;
  status: string;
  pdfUrl: string | null;
  metadata: Prisma.JsonValue;
  createdAt: Date;
  updatedAt: Date;
};
