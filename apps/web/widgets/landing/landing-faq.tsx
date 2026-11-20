import { ChevronDown } from "lucide-react";
import { useTranslations } from "next-intl";

import { Container, LandingSection, SectionHeading } from "./landing-section";

const QUESTIONS = [
  "ai",
  "free",
  "start",
  "cancel",
  "plans",
  "payments",
  "language",
] as const;

/**
 * Native <details> keeps the accordion accessible and working without JS,
 * and avoids adding a UI dependency for a single section.
 */
export function LandingFaq() {
  const t = useTranslations("landing.faq");

  return (
    <LandingSection id="faq" tone="muted" className="border-b-0">
      <Container className="flex max-w-[760px] flex-col gap-8">
        <SectionHeading
          tone="muted"
          align="center"
          eyebrow={t("eyebrow")}
          title={t("title")}
          className="self-center"
        />
        <div className="flex flex-col gap-2">
          {QUESTIONS.map((question) => (
            <details
              key={question}
              className="group overflow-hidden rounded-lg border bg-card open:bg-background"
            >
              <summary className="flex min-h-[52px] cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 text-[15px] font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground [&::-webkit-details-marker]:hidden">
                {t(`items.${question}.q`)}
                <ChevronDown
                  className="size-[18px] shrink-0 transition-transform group-open:rotate-180"
                  aria-hidden="true"
                />
              </summary>
              <p className="px-5 pb-5 text-foreground/70">
                {t(`items.${question}.a`)}
              </p>
            </details>
          ))}
        </div>
      </Container>
    </LandingSection>
  );
}
