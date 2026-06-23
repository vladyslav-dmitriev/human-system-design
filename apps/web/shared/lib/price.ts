export const formatStripePrice = (cents: number): string => {
  return (cents / 100).toFixed(2);
};

export const getFormattedPrice = (amount: number, currency: string): string => {
  console.log("currency", currency);

  return new Intl.NumberFormat("en-EN", {
    style: "currency",
    currency: "usd",
  }).format(formatStripePrice(amount));
};
