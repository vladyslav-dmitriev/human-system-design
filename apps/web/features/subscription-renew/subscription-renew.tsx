"use client";

import React, { useState } from "react";
import { RefreshCw } from "lucide-react";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { AutoRenewToggle } from "./auto-renew-toggle";
import { useTranslations } from "next-intl";
import { API_URL } from "@/api";

interface SubscriptionRenewBlockProps {
  status: "active" | "canceled" | "past_due" | null | undefined;
  autoRenew: boolean;
  onSuccessChange(autoRenew: boolean): void;
}

export function SubscriptionRenew({
  status,
  autoRenew,
  onSuccessChange,
}: SubscriptionRenewBlockProps) {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const isPremium = status === "active" || status === "past_due";

  const t = useTranslations();

  if (!isPremium) return null;

  const handleToggleRenew = async () => {
    setIsLoading(true);

    try {
      const response = await fetch(API_URL.billing.subscriptionsRenew(), {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ autoRenew: !autoRenew }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Ошибка изменения статуса продления");
      }

      onSuccessChange(data.autoRenew);

      toast.success(
        autoRenew
          ? t("auto_renew_message_turned_off")
          : t("auto_renew_message_restored"),
      );
    } catch (error: any) {
      toast.error("Не удалось изменить настройки", {
        description: error.message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="border border-muted/50 shadow-[0_8px_30px_rgb(0,0,0,0.04)] bg-background/60 backdrop-blur-md rounded-xl overflow-hidden transition-all duration-300">
      <CardHeader className="space-y-1.5 pb-5">
        <CardTitle className="text-md font-semibold tracking-tight text-foreground/90 flex items-center gap-2">
          <div className="p-1.5 bg-secondary/50 rounded-md border border-muted/40">
            <RefreshCw className="h-3.5 w-3.5 text-muted-foreground/80 stroke-[1.5]" />
          </div>
          {t("auto_renew_title")}
        </CardTitle>
        <CardDescription className="text-sm text-muted-foreground/80 leading-relaxed max-w-[80%] pl-1">
          {t("auto_renew_description")}
        </CardDescription>
      </CardHeader>

      <CardContent className="pb-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-3 bg-secondary/10 border border-muted/30 rounded-lg">
          {/* Кнопка переключения справа */}
          <AutoRenewToggle
            autoRenew={autoRenew}
            isLoading={isLoading}
            handleToggleRenew={handleToggleRenew}
          />
        </div>
      </CardContent>
    </Card>
  );
}
