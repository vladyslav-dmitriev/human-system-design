"use client";

import React from "react";
import { Elements } from "@stripe/react-stripe-js";
import { CheckoutFormContent } from "./checkout-form-content";
import { stripePromise } from "@/shared/lib/stripe";

const options = {
  appearance: {
    theme: "none" as const,
  },
};

type CheckoutFormProps = {
  userEmail?: string;
  paymentMethods: any[];
  paymentData: any;
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
