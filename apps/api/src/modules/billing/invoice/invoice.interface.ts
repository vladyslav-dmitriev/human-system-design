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
  metadata: any;
  createdAt: Date;
  updatedAt: Date;
};
