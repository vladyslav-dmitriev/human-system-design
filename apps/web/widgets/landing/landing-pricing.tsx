import { Check } from "lucide-react";
import { useTranslations } from "next-intl";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ROUTE } from "@/constants";
import { Link } from "@/i18n/navigation";
import { cn } from "@/shared/lib/utils";
import { Container, LandingSection, SectionHeading } from "./landing-section";

/**
 * Static marketing prices for guests. Signed-in users see live prices from the
 * billing API on the /pricing page.
 */
const PLANS = [
  {
    id: "free",
    price: "$0.00",
    features: ["tools", "community"],
    highlighted: false,
  },
  {
    id: "premium",
    price: "$9.99",
    features: ["free", "ai", "storage"],
    highlighted: true,
  },
  {
    id: "pro",
    price: "$19.99",
    features: ["premium", "support", "api"],
    highlighted: false,
  },
] as const;

export function LandingPricing() {
  const t = useTranslations("landing.pricing");

  return (
    <LandingSection id="pricing">
      <Container className="flex flex-col gap-12">
        <SectionHeading
          align="center"
          eyebrow={t("eyebrow")}
          title={t("title")}
          description={t("subtitle")}
        />
        <div className="grid grid-cols-[repeat(auto-fit,minmax(260px,1fr))] items-stretch gap-6">
          {PLANS.map((plan) => (
            <Card
              key={plan.id}
              className={cn(
                "flex flex-col gap-4 p-6 shadow-none",
                plan.highlighted && "border-foreground ring-1 ring-foreground",
              )}
            >
              <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-base font-semibold leading-6">
                    {t(`plans.${plan.id}.name`)}
                  </span>
                  {plan.highlighted ? <Badge>{t("popular")}</Badge> : null}
                </div>
                <div className="text-muted-foreground">
                  {t(`plans.${plan.id}.description`)}
                </div>
              </div>

              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-bold leading-9">
                  {plan.price}
                </span>
                <span className="text-muted-foreground">{t("perMonth")}</span>
              </div>

              <ul className="flex flex-col gap-2">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-center gap-2">
                    <Check className="size-4 shrink-0" aria-hidden="true" />
                    {t(`plans.${plan.id}.features.${feature}`)}
                  </li>
                ))}
              </ul>

              <Button
                asChild
                variant={plan.highlighted ? "default" : "outline"}
                size="lg"
                // "!" beats the global `a { color: inherit }` rule in globals.css
                className={cn(
                  "mt-auto h-11",
                  plan.highlighted && "text-primary-foreground!",
                )}
              >
                <Link href={ROUTE.CREATE_ACCOUNT}>
                  {t(`plans.${plan.id}.cta`)}
                </Link>
              </Button>
            </Card>
          ))}
        </div>
      </Container>
    </LandingSection>
  );
}
