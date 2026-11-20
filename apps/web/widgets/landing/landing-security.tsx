import { Check, Github, ShieldCheck } from "lucide-react";
import { useTranslations } from "next-intl";

import { Card } from "@/components/ui/card";
import { Container, LandingSection, SectionHeading } from "./landing-section";

const BULLETS = ["twoFactor", "oauth", "stripe"] as const;

const ACCOUNTS = [
  {
    id: "google",
    name: "Google",
    icon: <span className="font-bold">G</span>,
  },
  {
    id: "github",
    name: "Github",
    icon: <Github className="size-4" aria-hidden="true" />,
  },
] as const;

export function LandingSecurity() {
  const t = useTranslations("landing.security");

  return (
    <LandingSection id="security">
      <Container className="grid grid-cols-[repeat(auto-fit,minmax(300px,1fr))] items-center gap-12">
        <div className="flex flex-col gap-4">
          <SectionHeading
            eyebrow={t("eyebrow")}
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
        </div>

        <div
          role="img"
          aria-label={t("previewLabel")}
          className="flex flex-col gap-4"
        >
          <Card className="flex flex-col gap-1 p-6 shadow-none">
            <div className="flex items-center gap-3">
              <span className="flex size-8 items-center justify-center rounded-lg bg-muted">
                <ShieldCheck className="size-4" aria-hidden="true" />
              </span>
              <span className="flex-1 text-base font-semibold">
                {t("twoFactorTitle")}
              </span>
              <span className="relative h-5 w-9 shrink-0 rounded-full bg-primary">
                <span className="absolute right-0.5 top-0.5 size-4 rounded-full bg-primary-foreground" />
              </span>
            </div>
            <p className="pl-11 text-muted-foreground">{t("twoFactorText")}</p>
          </Card>

          <Card className="flex flex-col gap-4 p-6 shadow-none">
            <div className="flex flex-col gap-1">
              <div className="text-base font-semibold">{t("linkedTitle")}</div>
              <div className="text-muted-foreground">{t("linkedText")}</div>
            </div>
            {ACCOUNTS.map((account) => (
              <div
                key={account.id}
                className="flex items-center gap-3 rounded-lg border p-3"
              >
                <span className="flex size-8 items-center justify-center rounded-lg bg-muted">
                  {account.icon}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="font-medium">{account.name}</div>
                  <div className="text-xs leading-4 text-muted-foreground">
                    {t("notConnected")}
                  </div>
                </div>
                <span className="inline-flex h-8 items-center rounded-md border bg-background px-3 text-sm font-medium shadow-sm">
                  {t("connect")}
                </span>
              </div>
            ))}
          </Card>
        </div>
      </Container>
    </LandingSection>
  );
}
