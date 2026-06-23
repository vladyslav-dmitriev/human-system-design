import { Button } from "@/components/ui/button";
import { ROUTE } from "@/constants";
import { ArrowRight, Zap } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";

export const PromoBanner = () => {
  const t = useTranslations();

  return (
    <div className="relative w-full max-w-5xl mx-auto my-10 p-px rounded-2xl bg-white shadow-lg">
      <div className="absolute -top-3 left-6 bg-foreground text-primary-foreground text-[11px] font-semibold px-2.5 py-0.5 rounded-full uppercase">
        {t("promo_banner_badge")}
      </div>

      <div className="bg-white rounded-[15px] p-8 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="h-10 w-10 rounded-full bg-neutral-100 flex items-center justify-center">
            <Zap className="text-neutral-900 w-5 h-5" />
          </div>
          <div className="flex flex-col gap-0.5">
            <h3 className="text-neutral-900 font-semibold leading-none">
              {t("promo_banner_title")}
            </h3>
            <p className="text-sm text-neutral-500 leading-none mt-1">
              {t("promo_banner_description")}
            </p>
          </div>
        </div>

        <Link href={ROUTE.PRICING}>
          <Button
            variant="ghost"
            className="font-semibold hover:bg-primary hover:text-white"
          >
            {t("promo_banner_button")} <ArrowRight className="ml-2 w-4 h-4" />
          </Button>
        </Link>
      </div>
    </div>
  );
};
