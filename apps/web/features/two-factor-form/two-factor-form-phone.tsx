import { Phone } from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type TwoFactorFormPhoneProps = {
  phone: string | null;
  setPhone(phone: string): void;
  handleConnectPhone(): void;
};

export const TwoFactorFormPhone = ({
  phone,
  setPhone,
  handleConnectPhone,
}: TwoFactorFormPhoneProps) => {
  const t = useTranslations();

  return (
    <div className="max-w-sm flex items-center gap-3">
      <div className="relative flex-1">
        <Phone className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground/50" />
        <Input
          className="pl-9 bg-secondary/20 border-muted/60"
          placeholder="+380 (XX) XXX XX XX"
          value={phone ?? ""}
          onChange={(e) => setPhone(e.target.value)}
        />
      </div>
      <Button onClick={handleConnectPhone}>
        {t("two_factor_send_code_button")}
      </Button>
    </div>
  );
};
