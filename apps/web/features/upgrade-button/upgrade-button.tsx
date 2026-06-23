"use client";

import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ROUTE } from "@/constants";
import Link from "next/link";
import { useTranslations } from "next-intl";

export function UpgradeButton() {
  const t = useTranslations();

  return (
    <Link href={ROUTE.PRICING}>
      <Button
        size="sm"
        className="bg-foreground text-background hover:bg-foreground/90 font-medium shadow-sm px-4 h-9 flex items-center gap-2 group transition-all duration-200 rounded-md"
      >
        <Sparkles className="h-3.5 w-3.5 shrink-0 text-background/90 transition-transform duration-200 group-hover:scale-110" />

        <span className="text-[13px] tracking-tight">{t("upgrade")}</span>
      </Button>
    </Link>
  );
}
