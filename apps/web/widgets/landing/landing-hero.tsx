import { ArrowRight, Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ROUTE } from "@/constants";
import { Link } from "@/i18n/navigation";
import { DashboardPreview } from "./dashboard-preview";
import { Container } from "./landing-section";
import { PersonAvatar } from "./person-avatar";
import { StarRating } from "./star-rating";

const AVATARS = ["a", "b", "c", "a"] as const;

export function LandingHero() {
  const t = useTranslations("landing.hero");

  return (
    <section className="relative overflow-hidden">
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-[radial-gradient(color-mix(in_oklab,var(--foreground)_15%,transparent)_1px,transparent_1px)] [background-size:24px_24px] [mask-image:linear-gradient(to_bottom,#000_30%,transparent_85%)]"
      />

      <Container className="relative flex flex-col items-center gap-6 pb-[72px] pt-14 text-center md:pt-24">
        <Badge variant="secondary" className="gap-1.5 rounded-lg">
          <Sparkles className="size-3" aria-hidden="true" />
          {t("badge")}
        </Badge>

        <h1 className="max-w-[840px] text-4xl font-bold leading-10 tracking-tight md:text-[56px] md:leading-[58px]">
          {t("title")}
        </h1>

        <p className="max-w-[580px] text-lg leading-7 text-muted-foreground">
          {t("subtitle")}
        </p>

        <div className="mt-2 flex flex-wrap justify-center gap-3">
          {/* "!" beats the global `a { color: inherit }` rule in globals.css */}
          <Button asChild size="lg" className="h-11 text-primary-foreground!">
            <Link href={ROUTE.CREATE_ACCOUNT}>
              {t("primaryCta")}
              <ArrowRight aria-hidden="true" />
            </Link>
          </Button>
          <Button asChild size="lg" variant="outline" className="h-11">
            <a href="#ai">{t("secondaryCta")}</a>
          </Button>
        </div>

        <div className="mt-2 flex flex-wrap items-center justify-center gap-3">
          <div className="flex" aria-hidden="true">
            {AVATARS.map((variant, index) => (
              <PersonAvatar
                key={index}
                variant={variant}
                className="-ml-2.5 size-8 rounded-full border-2 border-background bg-background first:ml-0"
              />
            ))}
          </div>
          <div className="flex flex-col items-start text-left">
            <StarRating label={t("ratingLabel")} />
            <span className="text-xs leading-4 text-muted-foreground">
              {t("socialLine")}
            </span>
          </div>
        </div>
      </Container>

      <Container className="relative pb-14 md:pb-24">
        <DashboardPreview />
      </Container>
    </section>
  );
}
