import React from "react";
import { BillingPlans } from "@/features/billing-plans";
import { ExtraFeatureCard } from "@/widgets/extra-feature-card";
import {
  getBillingProducts,
  getUserData,
  getUserBilling,
  syncBillingProducts,
} from "@/utils";
import { getTranslations } from "next-intl/server";
import { cookies } from "next/headers";
import { Archive, Headphones } from "lucide-react";
import { API_URL } from "@/api";

const upgradeProduct = async (priceId: string) => {
  const cookieStore = await cookies();
  const cookieString = cookieStore.toString();

  const res = await fetch(API_URL.billing.subscriptionsUpgrade(), {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      Cookie: cookieString,
    },
    cache: "no-store",
    body: JSON.stringify({ type: "check", priceId }),
  });

  const data = await res.json();

  if (!res.ok) return;

  return {
    clientSecret: data.clientSecret,
    amount: data.amount,
    currency: data.currency,
    productName: data.productName,
  };
};

export default async function PricingPage() {
  const [userData, userBilling, billingProducts, t] = await Promise.all([
    getUserData(),
    getUserBilling(),
    getBillingProducts(),
    getTranslations(),
    // syncBillingProducts(),
  ]);

  console.log("userData p", userData);
  console.log("userBilling p", userBilling);
  console.log("billingProducts p", billingProducts);

  const lastPriceId = billingProducts.recurring?.find(
    (p) => p.name === "Pro",
  )?.priceId;

  if (!userBilling) {
    return null;
  }

  const paymentResponse = userBilling.subscription.stripeSubscriptionId
    ? await upgradeProduct(lastPriceId)
    : null;

  const nextBillingProducts = {
    ...billingProducts,
    recurring: billingProducts.recurring.map((plan) => {
      if (plan.priceId === lastPriceId) {
        return {
          ...plan,
          saleAmount: paymentResponse?.amount,
        };
      }

      return plan;
    }),
  };

  if (!userData) {
    return null;
  }

  const prioritySupport = billingProducts.oneTime.find(
    (p) => p.name === "Priority Support",
  );
  const unlimitedStorage = billingProducts.oneTime.find(
    (p) => p.name === "Unlimited Storage",
  );

  const prioritySupportDescription = t("priority_support_description");
  const unlimitedStorageDescription = t("unlimited_storage_description");

  return (
    <div className="container mx-auto px-2 max-w-5xl py-6">
      <section className="pb-4">
        <div className="text-center space-y-3 mb-4">
          <span className="text-xs font-semibold uppercase tracking-[0.2em] text-neutral-500">
            {t("pricing_page_badge")}
          </span>
          <h2 className="text-4xl md:text-5xl font-semibold tracking-tight text-neutral-900">
            {t("pricing_page_title")}
          </h2>
        </div>

        <BillingPlans
          userEmail={userData.email}
          currentPriceId={userBilling.subscription.stripePriceId}
          billingProducts={nextBillingProducts}
        />
      </section>

      <section className="border-t border-neutral-100 pt-8 space-y-8">
        <div className="space-y-2 text-center md:text-left">
          <h3 className="text-2xl font-semibold text-neutral-900">
            {t("pricing_page_customize_title")}
          </h3>
          <p className="text-neutral-500">
            {t("pricing_page_customize_description")}
          </p>
        </div>

        <div className="flex items-center justify-between gap-4 mb-10">
          {prioritySupport && (
            <ExtraFeatureCard
              key={prioritySupport.priceId}
              icon={<Headphones className="w-5 h-5" />}
              description={prioritySupportDescription}
              priceId={prioritySupport.priceId}
              currency={prioritySupport.currency}
              name={prioritySupport.name}
              amount={prioritySupport.amount}
              userEmail={userData.email}
              isPurchased={userBilling.features.find(
                (feature) => feature.name === prioritySupport.name,
              )}
            />
          )}

          {unlimitedStorage && (
            <ExtraFeatureCard
              key={unlimitedStorage.priceId}
              icon={<Archive className="w-5 h-5" />}
              priceId={unlimitedStorage.priceId}
              currency={unlimitedStorage.currency}
              name={unlimitedStorage.name}
              amount={unlimitedStorage.amount}
              description={unlimitedStorageDescription}
              userEmail={userData.email}
              isPurchased={userBilling.features.find(
                (feature) => feature.name === unlimitedStorage.name,
              )}
            />
          )}
        </div>
      </section>
    </div>
  );
}
