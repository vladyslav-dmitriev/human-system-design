import { loadStripe } from "@stripe/stripe-js";

// Инициализируем Stripe за пределами компонента (публичный ключ)
export const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLIC_KEY!,
);
