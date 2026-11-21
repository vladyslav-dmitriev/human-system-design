import { useId, useState } from "react";
import { Loader2, ArrowLeft } from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { AuthFormError } from "@/widgets/auth/auth-form-error";

type OtpAuthFormStepProps = {
  isLoading: boolean;
  error: string | null;
  phone: string;
  onVerify: (code: string) => void;
  onBack: () => void;
};

export const LoginAuthOtpStep = ({
  isLoading,
  error,
  phone,
  onVerify,
  onBack,
}: OtpAuthFormStepProps) => {
  const t = useTranslations();
  const errorId = useId();

  const [otp, setOtp] = useState<string>("");

  return (
    <main
      id="main"
      className="flex min-h-screen items-center justify-center p-6 bg-neutral-50/50"
    >
      <Card className="w-full max-w-sm border border-muted/50 shadow-[0_8px_30px_rgb(0,0,0,0.04)] bg-background/60 backdrop-blur-md rounded-2xl overflow-hidden">
        <CardHeader className="space-y-1 pb-4 text-center">
          <CardTitle className="text-2xl font-semibold tracking-tight">
            <h1>{t("verify_code")}</h1>
          </CardTitle>
          <CardDescription className="text-sm text-muted-foreground">
            {t("enter_otp_sent_to_phone", { phone })}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="flex justify-center py-2">
            <InputOTP
              maxLength={6}
              value={otp}
              onChange={setOtp}
              autoComplete="one-time-code"
              aria-label={t("otp_label")}
              aria-invalid={!!error}
              aria-describedby={error ? errorId : undefined}
            >
              <InputOTPGroup className="gap-3">
                {[...Array(6)].map((_, i) => (
                  <InputOTPSlot
                    key={i}
                    index={i}
                    className="h-12 w-10 rounded-lg border-muted/60"
                  />
                ))}
              </InputOTPGroup>
            </InputOTP>
          </div>

          <AuthFormError id={errorId} error={error} className="text-center" />

          <div className="px-4">
            <Button
              onClick={() => onVerify(otp)}
              className="w-full rounded-lg h-10 font-medium"
              disabled={isLoading || otp.length < 6}
              aria-busy={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                  <span className="sr-only">{t("loading")}</span>
                </>
              ) : (
                t("verify")
              )}
            </Button>

            <Button
              variant="ghost"
              onClick={onBack}
              className="w-full text-xs text-muted-foreground hover:bg-transparent"
            >
              <ArrowLeft className="mr-2 h-3.5 w-3.5" aria-hidden />
              {t("back_to_login")}
            </Button>
          </div>
        </CardContent>
      </Card>
    </main>
  );
};
