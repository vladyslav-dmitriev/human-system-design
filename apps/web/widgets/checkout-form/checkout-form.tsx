"use client";

import React from "react";
import { Elements } from "@stripe/react-stripe-js";
import { CheckoutFormContent } from "./checkout-form-content";
import type { StripeElementsOptions } from "@stripe/stripe-js";
import type {
  CheckoutPaymentData,
  PaymentMethod,
} from "@/shared/types/billing";
import { stripePromise } from "@/shared/lib/stripe";

// stripe-js поддерживает темы stripe | night | flat; "none" не входит в их число
const options: StripeElementsOptions = {
  appearance: {
    theme: "stripe",
  },
};

type CheckoutFormProps = {
  userEmail?: string;
  paymentMethods: PaymentMethod[];
  paymentData: CheckoutPaymentData;
};

export function CheckoutForm({
  userEmail,
  paymentMethods,
  paymentData,
}: CheckoutFormProps) {
  return (
    <Elements stripe={stripePromise} options={options}>
      <CheckoutFormContent
        userEmail={userEmail}
        paymentMethods={paymentMethods}
        paymentData={paymentData}
      />
    </Elements>
  );
}
