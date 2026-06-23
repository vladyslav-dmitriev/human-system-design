"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { BillingPlan } from "./billing-plan";
import { ROUTE } from "@/constants";
import { useTranslations } from "next-intl";
import { getFormattedPrice } from "@/shared/lib/price";

interface Plan {
  priceId: string;
  name: string;
  description: string;
  amount: number;
  saleAmount?: number;
  currency: string;
}

const viewedPlans: Plan[] = [
  {
    priceId: "free_id",
    name: "Free",
    description: "billing_plan_free_description",
    amount: 0,
    currency: "usd",
    features: ["Basic tools", "Community support"],
    interval: "month",
  },
  {
    name: "Premium",
    description: "billing_plan_premium_description",
    features: ["Everything in Free", "Advanced AI", "Cloud storage"],
  },
  {
    name: "Pro",
    description: "billing_plan_pro_description",
    features: ["Everything in Premium", "Priority support", "Custom API"],
  },
];

interface BillingPlansProps {
  userEmail: string;
  currentPriceId: string | null;
  billingProducts: {
    recurring: Plan[];
    oneTime: Plan[];
  };
}

export function BillingPlans({
  userEmail,
  currentPriceId,
  billingProducts,
}: BillingPlansProps) {
  const t = useTranslations();

  const router = useRouter();

  const plans = viewedPlans.map((fPlan) => {
    const plan = billingProducts.recurring.find(
      (bPlan) => bPlan.name === fPlan.name,
    );

    if (!plan) {
      return fPlan;
    }

    return {
      ...plan,
      ...fPlan,
    };
  });

  const currentPlanIndex = plans.findIndex(
    (plan) => plan.priceId === currentPriceId,
  );

  const onClickPlan = (priceId: string) => {
    const params = new URLSearchParams({
      priceId,
      email: userEmail,
      type: "subscription",
      billingOperation: currentPriceId ? "upgrade" : "purchase",
    });

    router.push(`${ROUTE.CHECKOUT}?${params.toString()}`);
  };

  return (
    <div className="w-full py-8">
      <div className={`grid md:grid-cols-3 gap-4`}>
        {plans.map((plan, index) => {
          const isCurrent = currentPriceId === plan.priceId;
          const isPopular = plan.name === "Pro";
          const isUnactive = plan.name === "Free" || index < currentPlanIndex;

          const getButtonText = () => {
            if (isCurrent) {
              return t("current_plan_title");
            }

            if (plan.saleAmount) {
              return t("upgrade_for", {
                price: getFormattedPrice(plan.saleAmount, plan.currency),
              });
            }

            return t("getPlan", {
              plan: plan.name,
            });
          };

          return (
            <BillingPlan
              key={plan.name}
              plan={plan}
              isCurrent={isCurrent}
              isPopular={isPopular}
              isUnactive={isUnactive}
              isDisabled={isCurrent || isUnactive}
              onClickPlan={onClickPlan}
              buttonText={getButtonText()}
            />
          );
        })}
      </div>
    </div>
  );
}
