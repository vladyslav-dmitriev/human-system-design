import { ShieldCheck, Smartphone } from "lucide-react";
import { useTranslations } from "next-intl";

type TwoFactorFormIdleProps = {
  phone: string | null;
};

export const TwoFactorFormIdle = ({ phone }: TwoFactorFormIdleProps) => {
  const t = useTranslations();

  return (
    <div className="flex items-center justify-between p-3 rounded-lg border border-muted/60 bg-secondary/10 hover:bg-secondary/20 transition-colors">
      <div className="flex items-center gap-3">
        <div className="h-8 w-8 rounded-md bg-white border border-muted/40 flex items-center justify-center">
          <Smartphone />
        </div>
        <div className="flex flex-col">
          <span className="text-sm font-medium">
            {t("two_factor_phone_label")}
          </span>
          <span className="text-[11px] text-muted-foreground">
            {phone || t("two_factor_not_connected")}
          </span>
        </div>
        <span className="text-[10px] font-bold tracking-wider uppercase px-1.5 py-0.5 rounded flex items-center gap-1 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
          <ShieldCheck className="h-2.5 w-2.5 stroke-[2.5]" />
          {t("two_factor_enabled_badge")}
        </span>
      </div>
    </div>
  );
};
