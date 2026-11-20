import * as React from "react";
import { useTranslations } from "next-intl";

import { Card } from "@/components/ui/card";
import {
  ApiIllustration,
  BriefingIllustration,
  IllustrationFrame,
  InsightsIllustration,
  NudgesIllustration,
  SyncIllustration,
  TasksIllustration,
} from "./illustrations";
import { Container, LandingSection, SectionHeading } from "./landing-section";

type FeatureId = "tasks" | "briefing" | "insights" | "nudges" | "sync" | "api";

const FEATURES: { id: FeatureId; Illustration: () => React.ReactElement }[] = [
  { id: "tasks", Illustration: TasksIllustration },
  { id: "briefing", Illustration: BriefingIllustration },
  { id: "insights", Illustration: InsightsIllustration },
  { id: "nudges", Illustration: NudgesIllustration },
  { id: "sync", Illustration: SyncIllustration },
  { id: "api", Illustration: ApiIllustration },
];

export function LandingFeatures() {
  const t = useTranslations("landing.features");

  return (
    <LandingSection id="features">
      <Container className="flex flex-col gap-12">
        <SectionHeading
          eyebrow={t("eyebrow")}
          title={t("title")}
          description={t("description")}
        />
        <div className="grid grid-cols-[repeat(auto-fit,minmax(300px,1fr))] gap-4">
          {FEATURES.map(({ id, Illustration }) => (
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
