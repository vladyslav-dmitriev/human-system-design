import { useTranslations } from "next-intl";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type TwoFactorFormOtpProps = {
  phone: string | null;
  otp: string;
  setOtp(otp: string): void;
  currentPassword: string;
  setCurrentPassword(password: string): void;
  /** ключ i18n ошибки неверного пароля */
  passwordError?: string | null;
  handleEnterCode(): void;
  loading?: boolean;
  errorId?: string;
};

export const TwoFactorFormOtp = ({
  phone,
  otp,
  setOtp,
  currentPassword,
  setCurrentPassword,
  passwordError = null,
  handleEnterCode,
  loading = false,
  errorId,
}: TwoFactorFormOtpProps) => {
  const t = useTranslations();
  const passwordId = `${errorId ?? "two-factor"}-password`;
  const passwordErrorId = `${passwordId}-error`;

  return (
    <div className="flex flex-col gap-3">
      {phone && (
        <p className="text-sm text-muted-foreground">
          {t("two_factor_otp_instruction", { phone })}
        </p>
      )}

      <div className="flex flex-col gap-1.5">
        <Label htmlFor={passwordId}>{t("password_current_label")}</Label>
        <Input
          id={passwordId}
          type="password"
          autoComplete="current-password"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          aria-invalid={passwordError ? true : undefined}
          aria-describedby={passwordError ? passwordErrorId : undefined}
        />
        {passwordError && (
          <p
            id={passwordErrorId}
            role="alert"
            className="text-xs font-medium text-destructive"
          >
            {t(passwordError)}
          </p>
        )}
      </div>

      <div className="flex items-center gap-3">
        <InputOTP
          maxLength={6}
          value={otp}
          onChange={setOtp}
          autoComplete="one-time-code"
          aria-label={t("otp_label")}
          aria-describedby={errorId}
        >
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
        <Button
          onClick={handleEnterCode}
          disabled={loading || otp.length < 6 || !currentPassword}
        >
          {t("two_factor_confirm_button")}
        </Button>
      </div>
    </div>
  );
};
