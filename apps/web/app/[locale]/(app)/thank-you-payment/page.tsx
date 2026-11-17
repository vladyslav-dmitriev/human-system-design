import React from "react";
import Link from "next/link";
import {
  ArrowRight,
  CreditCard,
  Calendar,
  Receipt,
  ShoppingCart,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ROUTE } from "@/constants";
import { getTranslations } from "next-intl/server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getFormattedPrice } from "@/shared/lib/price";
import { API_URL } from "@/api";

type ThankYouPaymentPageProps = {
  searchParams: Promise<{ [key: string]: string | undefined }>;
};

const getPaymentIntentData = async (paymentIntentId?: string) => {
  if (!paymentIntentId) return null;

  try {
    const cookieStore = await cookies();
    const cookieString = cookieStore.toString();

    const res = await fetch(
      API_URL.billing.paymentIntentCreate(paymentIntentId),
      {
        credentials: "include",
        headers: {
          Cookie: cookieString,
        },
        cache: "no-store",
      },
    );

    if (!res.ok) return null;

    return await res.json();
  } catch {
    return null;
  }
};

export default async function ThankYouPaymentPage({
  searchParams,
}: ThankYouPaymentPageProps) {
  const { payment_intent_id: paymentIntentId } = await searchParams;

  if (!paymentIntentId) {
    redirect(ROUTE.HOME);
  }

  const [paymentIntentData, t] = await Promise.all([
    getPaymentIntentData(paymentIntentId),
    getTranslations(),
  ]);

  if (!paymentIntentData) {
    redirect(ROUTE.HOME);
  }

  const isSubscription = paymentIntentData.metadata.type === "subscription";

  return (
    <div className="flex flex-col items-center justify-center min-h-[75vh] px-4 antialiased selection:bg-primary/20">
      <Card className="max-w-md w-full border border-border/40 shadow-xl shadow-foreground/[0.02] bg-card/60 backdrop-blur-xl relative overflow-hidden rounded-xl">
        <div className="absolute -top-20 -right-20 h-40 w-40 bg-primary/5 rounded-full blur-3xl pointer-events-none" />

        <CardHeader className="text-center pt-10 pb-2">
          <span className="text-[11px] font-semibold text-emerald-500 uppercase tracking-wider bg-emerald-500/10 px-2.5 py-0.5 rounded-full w-fit mx-auto mb-1">
            {t("payment_confirmed")}
          </span>

          <CardTitle className="text-xl font-semibold tracking-tight text-foreground">
            {t("purchase_completed")}
          </CardTitle>
        </CardHeader>

        <CardContent className="px-6 py-3 space-y-5">
          <div className="rounded-lg border border-border/30 bg-muted/20 p-4 space-y-3 text-[13px]">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground inline-flex items-center gap-1.5">
                <Receipt className="h-3.5 w-3.5 text-muted-foreground/70" />{" "}
                {t("transaction_type")}
              </span>
              <span className="font-medium text-foreground">
                {isSubscription
                  ? t("subscription_purchase")
                  : t("one_time_purchase")}
              </span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-muted-foreground inline-flex items-center gap-1.5">
                <ShoppingCart className="h-3.5 w-3.5 text-muted-foreground/70" />{" "}
                {t("tariff_plan")}
              </span>
              <span className="font-semibold text-primary bg-primary/10 text-[11px] px-2 py-0.5 rounded-md uppercase tracking-wider">
                {paymentIntentData.metadata.name}
              </span>
            </div>

            <div className="h-[1px] bg-border/30 w-full" />

            <div className="flex justify-between items-center">
              <span className="text-muted-foreground inline-flex items-center gap-1.5">
                <CreditCard className="h-3.5 w-3.5 text-muted-foreground/70" />
                {t("payment_method")}
              </span>
              <span className="text-foreground font-medium">
                Stripe Billing
              </span>
            </div>

            {isSubscription && (
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground inline-flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5 text-muted-foreground/70" />{" "}
                  {t("subscription_period")}
                </span>
                <span className="text-foreground">{t("monthly")}</span>
              </div>
            )}

            <div className="h-[1px] bg-border/30 w-full" />

            <div className="space-y-1.5 pt-1">
              <div className="flex justify-between items-center text-xs text-muted-foreground/80">
                <span>{t("tariff_price")}</span>
                <span>
                  {getFormattedPrice(
                    paymentIntentData.amount,
                    paymentIntentData.currency,
                  )}
                </span>
              </div>
              <div className="flex justify-between items-center text-xs text-muted-foreground/80">
                <span>{t("taxes_vat")}</span>
                <span>$0.00</span>
              </div>
              <div className="flex justify-between items-center pt-1 text-sm font-semibold text-foreground">
                <span>{t("total_paid")}</span>
                <span className="text-base text-foreground font-bold">
                  {getFormattedPrice(
                    paymentIntentData.amount,
                    paymentIntentData.currency,
                  )}
                </span>
              </div>
            </div>
          </div>

          <div className="text-center">
            <p className="text-[11px] text-muted-foreground/80 leading-normal max-w-[400px] mx-auto">
              {t("invoice_info")}
            </p>
          </div>
        </CardContent>

        <div className="h-[1px] bg-gradient-to-r from-transparent via-border/40 to-transparent w-full my-1" />

        <CardFooter className="pb-8 pt-4 px-6 flex flex-col gap-2">
          <Button className="w-full bg-foreground text-background hover:bg-foreground/90 font-medium text-[13px] h-9 shadow-sm group rounded-md">
            <Link
              href={ROUTE.HOME}
              className="flex items-center justify-center gap-1.5"
            >
              <span>{t("go_to_dashboard")}</span>
              <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
