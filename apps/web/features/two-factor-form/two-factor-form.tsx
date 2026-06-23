"use client";

import React from "react";
import { ShieldCheck } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { useTranslations } from "next-intl";
import { TwoFactorFormOtp } from "./two-factor-form-otp";
import { TwoFactorFormPhone } from "./two-factor-form-phone";
import { TwoFactorFormIdle } from "./two-factor-form-idle";
import { useTwoFactorForm } from "./use-two-factor-form";

type TwoFactorFormProps = {
  userPhone: string | null;
  userTwoFactorEnabled: boolean | null;
};

export function TwoFactorForm({
  userPhone,
  userTwoFactorEnabled = false,
}: TwoFactorFormProps) {
  const t = useTranslations();

  const {
    handleSwitchEnabled,
    handleConnectPhone,
    handleEnterCode,
    setPhone,
    setOtp,
    enabled,
    phone,
    step,
    otp,
    loading,
  } = useTwoFactorForm({
    userPhone,
    userTwoFactorEnabled,
  });

  return (
    <Card className="w-full border border-muted/50 shadow-[0_8px_30px_rgb(0,0,0,0.04)] bg-background/60 backdrop-blur-md rounded-xl overflow-hidden transition-all duration-300">
      <CardHeader className="flex flex-row items-center justify-between pb-4">
        <div className="space-y-1">
          <CardTitle className="text-md font-semibold flex items-center gap-2">
            <div className="p-1.5 bg-secondary/50 rounded-md border border-muted/40">
              <ShieldCheck className="h-4 w-4 text-muted-foreground" />
            </div>
            Two-factor authentication
          </CardTitle>
          <CardDescription>{t("two_factor_description")}</CardDescription>
        </div>

        {!loading && (
          <Switch checked={enabled} onCheckedChange={handleSwitchEnabled} />
        )}
      </CardHeader>

      {enabled && (
        <CardContent className="border-muted/40 animate-in slide-in-from-top-2">
          {step === "idle" && <TwoFactorFormIdle phone={phone} />}

          {step === "phone" && (
            <TwoFactorFormPhone
              phone={phone}
              setPhone={setPhone}
              handleConnectPhone={handleConnectPhone}
            />
          )}

          {step === "otp" && (
            <TwoFactorFormOtp
              phone={phone}
              otp={otp}
              setOtp={setOtp}
              handleEnterCode={handleEnterCode}
            />
          )}
        </CardContent>
      )}
    </Card>
  );
}
