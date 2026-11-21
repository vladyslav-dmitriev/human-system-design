import { Button } from "@/components/ui/button";
import { ROUTE } from "@/constants";
import { ArrowRight, Zap } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";

export const PromoBanner = () => {
  const t = useTranslations();

  return (
    <div className="relative w-full max-w-5xl mx-auto my-10 p-px rounded-2xl bg-card shadow-lg">
      <div className="absolute -top-3 left-6 bg-foreground text-primary-foreground text-xs font-semibold px-2.5 py-0.5 rounded-full uppercase">
        {t("promo_banner_badge")}
      </div>

      <div className="bg-card rounded-[15px] p-4 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
            <Zap className="text-foreground w-5 h-5" />
          </div>
          <div className="flex flex-col gap-0.5">
            <h3 className="text-foreground font-semibold leading-none">
              {t("promo_banner_title")}
            </h3>
            <p className="text-sm text-muted-foreground leading-none mt-1">
              {t("promo_banner_description")}
            </p>
          </div>
        </div>

        <Button
          asChild
          variant="ghost"
          className="font-semibold hover:bg-primary hover:text-white shrink-0"
        >
          <Link href={ROUTE.PRICING}>
            {t("promo_banner_button")} <ArrowRight className="ml-2 w-4 h-4" />
          </Link>
        </Button>
      </div>
    </div>
  );
};
