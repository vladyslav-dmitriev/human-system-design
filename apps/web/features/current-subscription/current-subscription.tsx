"use client";

import React, { useState } from "react";
import {
  CreditCard,
  Loader2,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useLocale, useTranslations } from "next-intl";
import { API_URL } from "@/api";

interface CurrentSubscriptionProps {
  planName?: "string";
  status: string | null; // 'active', 'past_due', 'canceled', null
  currentPeriodEnd: string | null;
}

export function CurrentSubscription({
  planName,
  status,
  currentPeriodEnd,
}: CurrentSubscriptionProps) {
  const t = useTranslations();
  const locale = useLocale();

  const [portalLoading, setPortalLoading] = useState(false);

  const handleManageSubscription = async () => {
    setPortalLoading(true);

    try {
      const response = await fetch(API_URL.billing.createPortalSession(), {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
      });
      const data = await response.json();
      if (data.url) {
        window.location.href = data.url; // Перенаправляем на портал Stripe
      }
    } catch (error) {
      console.error(error);
      alert("Не удалось открыть управление подпиской");
    } finally {
      setPortalLoading(false);
    }
  };

  return (
    <Card className="border border-muted/50 shadow-[0_8px_30px_rgb(0,0,0,0.04)] bg-background/60 backdrop-blur-md rounded-xl overflow-hidden transition-all duration-300">
      <CardHeader className="space-y-1.5 pb-5 relative">
        <div className="absolute top-6 right-6">
          {planName ? (
            <div className="text-[11px] font-bold tracking-wider uppercase px-4 py-2 rounded-md bg-foreground text-background shadow-[0_3px_12px_rgba(0,0,0,0.08)] border border-foreground/10 flex items-center gap-1.5 transition-all">
              {planName}
            </div>
          ) : (
            <div className="text-[11px] font-semibold tracking-wider uppercase px-4 py-2 rounded-md bg-secondary/40 text-muted-foreground/60 border border-muted/30">
              Free
            </div>
          )}
        </div>

        <CardTitle className="text-md font-semibold tracking-tight text-foreground/90 flex items-center gap-2">
          <div className="p-1.5 bg-secondary/50 rounded-md border border-muted/40">
            <CreditCard className="h-3.5 w-3.5 text-muted-foreground/80 stroke-[1.5]" />
          </div>
          {t("current_plan_title")}
        </CardTitle>
        <CardDescription className="text-sm text-muted-foreground/80 leading-relaxed max-w-[75%] pl-1">
          {t("current_plan_description")}
        </CardDescription>
      </CardHeader>

      <CardContent className="pb-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-3 bg-secondary/10 border border-muted/30 rounded-lg">
          {/* Интерактивный статус подписки с пульсирующим индикатором */}
          <div className="flex items-center gap-2.5 self-start sm:self-center">
            <div className="flex flex-col">
              <span className="text-[13px] font-medium text-foreground/80 leading-none">
                {status === "active"
                  ? t("subscription_status_active")
                  : status === "past_due"
                    ? t("subscription_status_payment_required")
                    : t("subscription_status_not_created")}
              </span>

              {/* Блок с информацией о периоде оплаты */}
              {status === "active" && currentPeriodEnd && (
                <span className="text-[13px] text-muted-foreground/70 mt-1 flex items-center gap-1">
                  {t("subscription_status_paid_until", {
                    date: new Date(currentPeriodEnd).toLocaleDateString(
                      locale === "uk" ? "uk-UA" : "en-US",
                      {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      },
                    ),
                  })}
                </span>
              )}

              {status === "past_due" && (
                <span className="text-[11px] text-destructive/80 mt-1 flex items-center gap-1">
                  {t("subscription_status_access_restricted")}
                </span>
              )}

              {status !== "active" && status !== "past_due" && (
                <span className="text-[11px] text-muted-foreground/50 mt-1 flex items-center gap-1">
                  {t("subscription_status_no_active_periods")}
                </span>
              )}
            </div>
          </div>

          {/* Кнопка управления справа */}
          {planName && (
            <Button
              type="button"
              disabled={portalLoading}
              onClick={handleManageSubscription}
              className="w-full sm:w-auto h-9 px-4 rounded-lg font-medium text-[13px] transition-all duration-200 bg-secondary text-foreground border border-muted/40 hover:bg-foreground hover:text-background hover:border-foreground group"
            >
              {portalLoading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <span className="flex items-center gap-1.5">
                  {t("subscription_manage_button")}
                  <ArrowRight className="h-3 w-3 opacity-60 transition-transform duration-200 group-hover:translate-x-0.5" />
                </span>
              )}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
