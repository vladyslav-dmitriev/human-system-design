import * as React from "react";
import { useTranslations } from "next-intl";

import { Card } from "@/components/ui/card";
import {
  PlanIllustration,
  PromptIllustration,
  SignupIllustration,
} from "./illustrations";
import { Container, LandingSection, SectionHeading } from "./landing-section";

const STEPS: {
  id: "signup" | "prompt" | "plan";
  Illustration: () => React.ReactElement;
}[] = [
  { id: "signup", Illustration: SignupIllustration },
  { id: "prompt", Illustration: PromptIllustration },
  { id: "plan", Illustration: PlanIllustration },
];

export function LandingHowItWorks() {
  const t = useTranslations("landing.how");

  return (
    <LandingSection tone="muted">
      <Container className="flex flex-col gap-12">
        <SectionHeading
          tone="muted"
          eyebrow={t("eyebrow")}
          title={t("title")}
        />
        <ol className="grid grid-cols-[repeat(auto-fit,minmax(260px,1fr))] gap-6">
          {STEPS.map(({ id, Illustration }, index) => (
            <li key={id} className="flex flex-col gap-4">
              <Card className="p-4 leading-none shadow-none [&>svg]:h-auto [&>svg]:w-full">
                <Illustration />
              </Card>
              <div className="flex gap-3">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary font-semibold text-primary-foreground">
                  {index + 1}
                </span>
                <div>
                  <h3 className="text-base font-semibold leading-6">
                    {t(`steps.${id}.title`)}
                  </h3>
                  <p className="mt-1 text-foreground/70">
                    {t(`steps.${id}.text`)}
                  </p>
                </div>
              </div>
            </li>
          ))}
        </ol>
      </Container>
    </LandingSection>
  );
}
