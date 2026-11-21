"use client";

import { Button } from "@/components/ui/button";
import { ROUTE } from "@/constants";
import { getFormattedPrice } from "@/shared/lib/price";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";

type ExtraFeatureCardProps = {
  priceId: string;
  icon: React.ReactNode;
  currency: string;
  name: string;
  amount: number;
  description: string;
  userEmail: string;
  isPurchased: boolean;
};

export const ExtraFeatureCard = ({
  priceId,
  icon,
  currency,
  name,
  amount,
  description,
  userEmail,
  isPurchased,
}: ExtraFeatureCardProps) => {
  const t = useTranslations();
  const locale = useLocale();

  const router = useRouter();

  const onClickPrioritySupport = () => {
    if (isPurchased) return;

    const params = new URLSearchParams({
      priceId,
      email: userEmail,
      type: "one-payment",
      billingOperation: "purchase",
    });

    router.push(`${ROUTE.CHECKOUT}?${params.toString()}`);
  };

  return (
    <div className="w-full max-w-3xl mx-auto p-4 sm:p-6 rounded-3xl border border-muted bg-card shadow-sm flex flex-col md:flex-row items-center justify-between gap-6 hover:shadow-md transition-shadow">
      <div className="flex items-start gap-4">
        <div className="p-2 bg-muted rounded-md text-foreground">{icon}</div>

        <div className="flex flex-col">
          <h3 className="text-md font-semibold text-foreground">{name}</h3>

          <p className="text-sm text-muted-foreground mt-1">{description}</p>

          <Button
            variant={isPurchased ? "outline" : "default"}
            disabled={isPurchased}
            onClick={onClickPrioritySupport}
            className="mt-4 ml-auto flex-grow md:flex-grow-0 px-6 py-2.5 text-sm font-medium transition-colors"
          >
            {isPurchased
              ? t("plan_already_purchased")
              : t("priority_support_button", {
                  price: getFormattedPrice(amount, currency, locale),
                })}
          </Button>
        </div>
      </div>
    </div>
  );
};
