export const formatStripePrice = (cents: number): string => {
  return (cents / 100).toFixed(2);
};

export const getFormattedPrice = (
  amount: number | null | undefined,
  currency: string | null | undefined,
): string => {
  return new Intl.NumberFormat("en-EN", {
    style: "currency",
    currency: currency || "usd",
  }).format((amount ?? 0) / 100);
};
