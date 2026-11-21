import React from "react";
import { getTranslations } from "next-intl/server";
import { BillingSettings } from "@/widgets/billing-settings";
import { getBillingProducts, getPaymentMethods, getUserBilling } from "@/utils";
import { PromoBanner } from "@/widgets/promo-banner";

export default async function BillingPage() {
  const [userBilling, paymentMethods, billingProducts, t] = await Promise.all([
    getUserBilling(),
    getPaymentMethods(),
    getBillingProducts(),
    getTranslations(),
  ]);

  if (!userBilling) {
    return (
      <div className="py-10 max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">{t("billing")}</h1>
        <p role="alert" className="text-sm text-destructive">
          {t("page_load_failed")}
        </p>
      </div>
    );
  }

  return (
    <div className="py-10 max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">{t("billing")}</h1>

      <PromoBanner />

      <BillingSettings
        billingProducts={billingProducts}
        subscription={userBilling.subscription}
        paymentMethods={paymentMethods}
      />
    </div>
  );
}
