"use client";

import React, { useState } from "react";
import { CurrentSubscription } from "@/features/current-subscription";
import { SubscriptionRenew } from "@/features/subscription-renew";
import { BillingInvoicesHistory } from "@/widgets/billing-invoices-history";
import { PaymentCards } from "@/widgets/payment-cards";
import { PaymentMethod } from "@/shared/types/billing";

interface BillingSettingsClientProps {
  billingProducts: any;
  subscription: any;
  paymentMethods: PaymentMethod[];
}

export const BillingSettings = ({
  billingProducts,
  subscription,
  paymentMethods,
}: BillingSettingsClientProps) => {
  const [subscriptionData, setSubscriptionData] = useState(subscription);

  const onSuccessChangeRenew = (nextAutoRenew: boolean) => {
    setSubscriptionData({ ...subscriptionData, autoRenew: nextAutoRenew });
  };

  if (!subscriptionData) {
    return null;
  }

  const planName = billingProducts.recurring.find(
    (p) => p.priceId === subscriptionData.stripePriceId,
  )?.name;

  return (
    <div className="space-y-3">
      <CurrentSubscription
        planName={planName}
        status={subscriptionData.subscriptionStatus}
        currentPeriodEnd={subscriptionData.currentPeriodEnd}
      />

      <SubscriptionRenew
        status={subscriptionData.status}
        autoRenew={subscriptionData.autoRenew}
        onSuccessChange={onSuccessChangeRenew}
      />

      <PaymentCards
        autoRenew={subscriptionData.autoRenew}
        paymentMethods={paymentMethods}
      />

      <BillingInvoicesHistory />
    </div>
  );
};
