import { ArrowUp, Check, Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ROUTE } from "@/constants";
import { Link } from "@/i18n/navigation";
import { Container, LandingSection, SectionHeading } from "./landing-section";

const BULLETS = ["organise", "prioritise", "schedule"] as const;

const PLAN = [
  { id: "brief", high: true },
  { id: "pricing", high: false },
  { id: "call", high: false },
] as const;

export function LandingAiAssistant() {
  const t = useTranslations("landing.ai");

  return (
    <LandingSection id="ai">
      <Container className="grid grid-cols-[repeat(auto-fit,minmax(320px,1fr))] items-center gap-12">
        <div className="flex flex-col gap-4">
          <SectionHeading
            eyebrow={
              <>
                <Sparkles className="size-3.5" aria-hidden="true" />
                {t("eyebrow")}
              </>
            }
            title={t("title")}
            description={t("description")}
          />
          <ul className="flex flex-col gap-3">
            {BULLETS.map((bullet) => (
              <li key={bullet} className="flex items-center gap-3">
                <Check className="size-[18px] shrink-0" aria-hidden="true" />
                {t(`bullets.${bullet}`)}
              </li>
            ))}
          </ul>
          <div className="mt-2">
            <Button asChild size="lg" className="h-11 text-primary-foreground!">
              <Link href={ROUTE.CREATE_ACCOUNT}>{t("cta")}</Link>
            </Button>
          </div>
        </div>

        <Card
          role="img"
          aria-label={t("chat.label")}
          className="flex flex-col gap-4 p-5 shadow-[0_30px_60px_-30px_rgba(0,0,0,0.25)]"
        >
          <div className="flex items-center gap-2.5">
            <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Sparkles className="size-4" aria-hidden="true" />
            </span>
            <span className="text-base font-semibold">{t("chat.name")}</span>
            <Badge variant="secondary" className="ml-auto">
              {t("chat.status")}
            </Badge>
          </div>

          <div className="max-w-[88%] self-end rounded-[14px] rounded-br-sm bg-primary px-3.5 py-3 text-primary-foreground">
            {t("chat.userMessage")}
          </div>

          <div className="flex flex-col gap-2.5 rounded-[14px] rounded-bl-sm border bg-muted p-3.5">
            <p className="text-foreground/70">{t("chat.reply")}</p>
            {PLAN.map((item) => (
              <div
                key={item.id}
                className="flex items-center gap-3 rounded-lg border bg-card px-3 py-2.5"
              >
                <span className="w-[76px] shrink-0 whitespace-nowrap font-medium text-foreground/70">
                  {t(`chat.plan.${item.id}.when`)}
                </span>
                <span className="min-w-0 flex-1">
                  {t(`chat.plan.${item.id}.title`)}
                </span>
                <Badge variant={item.high ? "default" : "outline"}>
                  {t(`chat.plan.${item.id}.priority`)}
                </Badge>
              </div>
            ))}
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs leading-4 text-foreground/70">
                {t("chat.summary")}
              </span>
              <span className="flex gap-2">
                <Badge
                  variant="outline"
                  className="h-8 rounded-md bg-background px-3 text-sm font-medium"
                >
                  {t("chat.adjust")}
                </Badge>
                <Badge className="h-8 rounded-md px-3 text-sm font-medium">
                  {t("chat.accept")}
                </Badge>
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 rounded-[10px] border py-1.5 pl-3 pr-1.5 text-muted-foreground">
            <span className="min-w-0 flex-1">{t("chat.placeholder")}</span>
            <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <ArrowUp className="size-4" aria-hidden="true" />
            </span>
          </div>
        </Card>
      </Container>
    </LandingSection>
  );
}
