import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useTranslations } from "next-intl";
import { getFormattedPrice } from "@/shared/lib/price";

type BillingPlanProps = {
  plan: any;
  isCurrent: boolean;
  isPopular: boolean;
  isUnactive: boolean;
  isDisabled: boolean;
  onClickPlan(priceId: string): void;
  buttonText: React.ReactNode;
};

export const BillingPlan = ({
  plan,
  isCurrent,
  isPopular,
  isUnactive,
  isDisabled,
  onClickPlan,
  buttonText,
}: BillingPlanProps) => {
  const t = useTranslations();

  return (
    <Card
      key={plan.priceId}
      className={`flex flex-col justify-between relative ${isUnactive ? "muted-foreground/20" : "border-primary"}`}
    >
      {isPopular && (
        <div className="absolute -top-3 right-4 bg-primary text-primary-foreground text-[11px] font-semibold px-2.5 py-0.5 rounded-full">
          {t("popular")}
        </div>
      )}

      <CardHeader>
        <CardTitle className="text-xl">{plan.name}</CardTitle>
        <CardDescription>{t(plan.description)}</CardDescription>

        <div className="mt-4 text-3xl font-bold">
          <span>{getFormattedPrice(plan.amount, plan.currency)}</span>

          <span className="text-sm font-normal text-muted-foreground">
            / {t(plan.interval)}
          </span>
        </div>
      </CardHeader>

      <CardContent className="space-y-3 flex-1">
        {plan.features.map((feature) => (
          <div key={feature} className="flex items-center gap-2 text-sm">
            <Check className="h-4 w-4 text-green-500" /> <span>{feature}</span>
          </div>
        ))}
      </CardContent>

      <CardFooter>
        {!isUnactive && (
          <Button
            className="w-full"
            variant={isCurrent ? "outline" : "default"}
            disabled={isDisabled}
            onClick={() => onClickPlan(plan.priceId)}
          >
            {buttonText}
          </Button>
        )}
      </CardFooter>
    </Card>
  );
};
