export type PaymentMethod = {
  id: string;
  brand: string;
  last4: string;
  expMonth: number | undefined;
  expYear: number | undefined;
  isDefault: boolean;
};
