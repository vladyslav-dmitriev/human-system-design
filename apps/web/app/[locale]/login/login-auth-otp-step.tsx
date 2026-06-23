import { Loader2, ArrowLeft } from "lucide-react";
import { Turnstile } from "@marsidev/react-turnstile";
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
import { useState } from "react";

type OtpAuthFormStepProps = {
  isLoading: boolean;
  error: string | null;
  phone: string;
  onVerify: (code: string) => void;
  onBack: () => void;
  onCaptchaSuccess: (captchaToken: string) => void;
};

export const LoginAuthOtpStep = ({
  isLoading,
  error,
  phone,
  onVerify,
  onBack,
  onCaptchaSuccess,
}: OtpAuthFormStepProps) => {
  const t = useTranslations();

  const [otp, setOtp] = useState<string>("");

  return (
    <div className="flex mt-30 items-center justify-center p-6 bg-neutral-50/50">
      <Card className="w-full max-w-sm border border-muted/50 shadow-[0_8px_30px_rgb(0,0,0,0.04)] bg-background/60 backdrop-blur-md rounded-2xl overflow-hidden">
        <CardHeader className="space-y-1 pb-4 text-center">
          <CardTitle className="text-2xl font-semibold tracking-tight">
            {t("verify_code")}
          </CardTitle>
          <CardDescription className="text-sm text-muted-foreground">
            {t("enter_otp_sent_to_phone", { phone })}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="flex justify-center py-2">
            <InputOTP maxLength={6} value={otp} onChange={setOtp}>
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

          {error && (
            <p className="text-[11px] text-destructive font-medium text-center">
              {error}
            </p>
          )}

          <div className="flex justify-center">
            <Turnstile
              siteKey={process.env.NEXT_PUBLIC_CLOUDFLARE_SITE_KEY!}
              onSuccess={onCaptchaSuccess}
            />
          </div>

          <div className="px-4">
            <Button
              onClick={() => onVerify(otp)}
              className="w-full rounded-lg h-10 font-medium"
              disabled={isLoading || otp.length < 6}
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                t("verify")
              )}
            </Button>

            <Button
              variant="ghost"
              onClick={onBack}
              className="w-full text-xs text-muted-foreground hover:bg-transparent"
            >
              <ArrowLeft className="mr-2 h-3.5 w-3.5" />
              {t("back_to_login")}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
