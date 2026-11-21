"use client";

import React, { useState } from "react";
import { AlertTriangle, Loader2, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useTranslations } from "next-intl";
import { ConfirmDialog } from "@/shared/ui/confirm-dialog";
import { apiErrorKey, getApiErrorCode } from "@/shared/lib/api-error";

interface SubscriptionCancelBlockProps {
  status: string | null;
}

export function SubscriptionCancel({ status }: SubscriptionCancelBlockProps) {
  const t = useTranslations();
  const [isLoading, setIsLoading] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const isPremium = status === "active" || status === "past_due";

  // Если пользователь и так на бесплатном плане, скрываем блок отмены
  if (!isPremium) return null;

  const handleCancelSubscription = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/billing/cancel-immediately", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      if (!response.ok) {
        const code = await getApiErrorCode(response);
        toast.error(t("subscription_cancel_failed"), {
          description: t(apiErrorKey(code)),
        });
        return;
      }

      toast.success(t("subscription_cancel_success"), {
        description: t("subscription_cancel_success_description"),
      });
    } catch (error) {
      console.error(error);
      toast.error(t("subscription_cancel_failed"));
    } finally {
      setIsLoading(false);
      setIsConfirmOpen(false);
    }
  };

  return (
    <Card className="max-w-xl border border-muted/50 shadow-[0_8px_30px_rgb(0,0,0,0.04)] bg-background/60 backdrop-blur-md rounded-xl overflow-hidden transition-all duration-300">
      <CardHeader className="space-y-1.5 pb-5">
        <CardTitle className="text-sm font-semibold tracking-tight text-foreground/90 flex items-center gap-2">
          <div className="p-1.5 bg-secondary/50 rounded-md border border-muted/40">
            <AlertTriangle className="h-3.5 w-3.5 text-muted-foreground/80 stroke-[1.5]" />
          </div>
          {t("subscription_cancel_title")}
        </CardTitle>
        <CardDescription className="text-xs text-muted-foreground/80 leading-relaxed max-w-[90%]">
          {t("subscription_cancel_description")}
        </CardDescription>
      </CardHeader>

      <CardContent className="pb-6">
        <div className="flex justify-end pt-1">
          <Button
            type="button"
            disabled={isLoading}
            onClick={() => setIsConfirmOpen(true)}
            className="w-full sm:w-auto h-9 px-4 rounded-lg font-medium text-xs transition-all duration-200 bg-secondary text-foreground border border-muted/40 hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30 disabled:opacity-50 disabled:cursor-not-allowed group"
          >
            {isLoading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
            ) : (
              <span className="flex items-center gap-1.5">
                {t("cancelSubscription")}
                <ArrowRight className="h-3 w-3 opacity-60 transition-transform duration-200 group-hover:translate-x-0.5" />
              </span>
            )}
          </Button>
        </div>
      </CardContent>

      <ConfirmDialog
        open={isConfirmOpen}
        onOpenChange={setIsConfirmOpen}
        title={t("subscription_cancel_confirm_title")}
        description={t("subscription_cancel_confirm_description")}
        confirmLabel={t("cancelSubscription")}
        destructive
        isLoading={isLoading}
        onConfirm={handleCancelSubscription}
      />
    </Card>
  );
}
