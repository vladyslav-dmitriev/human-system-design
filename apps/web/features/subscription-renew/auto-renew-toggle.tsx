import React from "react";
import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";

interface AutoRenewToggleProps {
  autoRenew: boolean;
  isLoading: boolean;
  handleToggleRenew: () => Promise<void>;
}

export const AutoRenewToggle: React.FC<AutoRenewToggleProps> = ({
  autoRenew,
  isLoading,
  handleToggleRenew,
}) => {
  const t = useTranslations();

  return (
    <>
      <div className="flex flex-col space-y-0.5">
        <label className="text-[13px] font-medium text-foreground/90 tracking-tight">
          {t("auto_renew_title")}
        </label>
        <span className="text-[13px] text-muted-foreground/60">
          {autoRenew
            ? t("auto_renew_status_enabled")
            : t("auto_renew_status_disabled")}
        </span>
      </div>

      <button
        type="button"
        role="switch"
        aria-checked={autoRenew}
        disabled={isLoading}
        onClick={handleToggleRenew}
        className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full border border-transparent transition-colors duration-200 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-foreground/20 disabled:cursor-not-allowed disabled:opacity-40 ${
          autoRenew
            ? "bg-muted-foreground/60"
            : "bg-secondary border-muted/50 hover:border-muted/80"
        }`}
      >
        {isLoading ? (
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
            <Loader2
              className={`h-2.5 w-2.5 animate-spin ${
                autoRenew ? "text-background" : "text-muted-foreground"
              }`}
            />
          </div>
        ) : (
          <span
            className={`pointer-events-none block h-3.5 w-3.5 rounded-full shadow-sm transition-transform duration-200 ${
              autoRenew
                ? "translate-x-[17px] bg-background"
                : "translate-x-[3px] bg-primary/80"
            }`}
          />
        )}
      </button>
    </>
  );
};
