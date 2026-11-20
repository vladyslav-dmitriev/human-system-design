export type PaymentMethod = {
  id: string;
  brand: string;
  last4: string;
  expMonth: number | undefined;
  expYear: number | undefined;
  isDefault: boolean;
};

/** Данные для оплаты на checkout (api: finance checkout / subscriptions upgrade) */
export type CheckoutPaymentData = {
  clientSecret: string;
  amount: number;
  currency: string;
  productName: string;
};

/** Цена/продукт из GET billing/products (api: ProductMapper.toDomain) */
export type BillingProduct = {
  priceId: string;
  productId: string;
  type: string;
  name: string;
  description: string | null;
  amount: number | null;
  currency: string;
  interval?: string;
  /** Цена апгрейда, считается на странице pricing */
  saleAmount?: number;
};

export type BillingProducts = {
  recurring: BillingProduct[];
  oneTime: BillingProduct[];
};

export type UserSubscription = {
  stripeSubscriptionId: string | null;
  status: string | null;
  autoRenew: boolean | null;
  currentPeriodEnd: string | null;
  stripePriceId: string | null;
};

export type UserFeature = {
  id: string;
  expiresAt: string | null;
  name: string;
  isActive: boolean;
};

/** Ответ GET billing/user (api: FinanceMapper.toResponse) */
export type UserBilling = {
  billing: {
    stripeCustomerId: string | null;
    defaultPaymentMethodId: string | null;
    currency: string | null;
  };
  subscription: UserSubscription;
  features: UserFeature[];
};
