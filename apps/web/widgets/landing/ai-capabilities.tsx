import * as React from "react";
import { useTranslations } from "next-intl";

import { Card } from "@/components/ui/card";
import {
  GoalsIllustration,
  IllustrationFrame,
  PrioritiesIllustration,
  ScheduleIllustration,
} from "./illustrations";
import { Container, LandingSection, SectionHeading } from "./landing-section";

const ITEMS: {
  id: "goals" | "priorities" | "schedule";
  Illustration: () => React.ReactElement;
}[] = [
  { id: "goals", Illustration: GoalsIllustration },
  { id: "priorities", Illustration: PrioritiesIllustration },
  { id: "schedule", Illustration: ScheduleIllustration },
];

export function LandingAiCapabilities() {
  const t = useTranslations("landing.capabilities");

  return (
    <LandingSection tone="muted">
      <Container className="flex flex-col gap-12">
        <SectionHeading
          tone="muted"
          eyebrow={t("eyebrow")}
          title={t("title")}
          description={t("description")}
        />
        <div className="grid grid-cols-[repeat(auto-fit,minmax(260px,1fr))] gap-4">
          {ITEMS.map(({ id, Illustration }) => (
            <Card key={id} className="flex flex-col gap-4 p-4 shadow-none">
              <IllustrationFrame>
                <Illustration />
              </IllustrationFrame>
              <div className="flex flex-col gap-2 px-2 pb-2">
                <h3 className="text-base font-semibold leading-6">
                  {t(`items.${id}.title`)}
                </h3>
                <p className="text-muted-foreground">{t(`items.${id}.text`)}</p>
              </div>
            </Card>
          ))}
        </div>
      </Container>
    </LandingSection>
  );
}
