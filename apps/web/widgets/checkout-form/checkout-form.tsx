"use client";

import React from "react";
import { Elements } from "@stripe/react-stripe-js";
import { CheckoutFormContent } from "./checkout-form-content";
import type { StripeElementsOptions } from "@stripe/stripe-js";
import type {
  CheckoutRequest,
  CheckoutSummary,
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
  summary: CheckoutSummary;
  request: CheckoutRequest;
};

export function CheckoutForm({
  userEmail,
  paymentMethods,
  summary,
  request,
}: CheckoutFormProps) {
  return (
    <Elements stripe={stripePromise} options={options}>
      <CheckoutFormContent
        userEmail={userEmail}
        paymentMethods={paymentMethods}
        summary={summary}
        request={request}
      />
    </Elements>
  );
}
