import { useTranslations } from "next-intl";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";

import { Button } from "@/components/ui/button";

type TwoFactorFormOtpProps = {
  phone: string | null;
  otp: string;
  setOtp(otp: string): void;
  handleEnterCode(): void;
};

export const TwoFactorFormOtp = ({
  phone,
  otp,
  setOtp,
  handleEnterCode,
}: TwoFactorFormOtpProps) => {
  const t = useTranslations();

  return (
    <div className="flex flex-col gap-3">
      {phone && (
        <p className="text-sm text-muted-foreground">
          {t("two_factor_otp_instruction", { phone })}
        </p>
      )}

      <div className="flex items-center gap-3">
        <InputOTP maxLength={6} value={otp} onChange={setOtp}>
          <InputOTPGroup className="gap-3">
            {[...Array(6)].map((_, i) => (
              <InputOTPSlot
                key={i}
                index={i}
                className="h-9 w-9 rounded-lg border-muted/60"
              />
            ))}
          </InputOTPGroup>
        </InputOTP>
        <Button onClick={handleEnterCode}>
          {t("two_factor_confirm_button")}
        </Button>
      </div>
    </div>
  );
};
