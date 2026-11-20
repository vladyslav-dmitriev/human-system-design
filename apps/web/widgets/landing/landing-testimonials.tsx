import { useTranslations } from "next-intl";

import { Card } from "@/components/ui/card";
import { Container, LandingSection, SectionHeading } from "./landing-section";
import { PersonAvatar } from "./person-avatar";
import { StarRating } from "./star-rating";

const TESTIMONIALS = [
  { id: "elena", avatar: "a" },
  { id: "daniel", avatar: "b" },
  { id: "sofia", avatar: "c" },
] as const;

export function LandingTestimonials() {
  const t = useTranslations("landing.testimonials");

  return (
    <LandingSection tone="muted">
      <Container className="flex flex-col gap-12">
        <SectionHeading
          tone="muted"
          eyebrow={t("eyebrow")}
          title={t("title")}
        />
        <div className="grid grid-cols-[repeat(auto-fit,minmax(260px,1fr))] gap-4">
          {TESTIMONIALS.map(({ id, avatar }) => (
            <Card key={id} className="shadow-none">
              <figure className="m-0 flex h-full flex-col justify-between gap-5 p-6">
                <div className="flex flex-col gap-4">
                  <StarRating label={t("ratingLabel")} />
                  <blockquote className="text-base leading-6">
                    “{t(`items.${id}.quote`)}”
                  </blockquote>
                </div>
                <figcaption className="flex items-center gap-3">
                  <PersonAvatar variant={avatar} />
                  <span>
                    <span className="block font-medium">
                      {t(`items.${id}.name`)}
                    </span>
                    <span className="block text-xs leading-4 text-muted-foreground">
                      {t(`items.${id}.role`)}
                    </span>
                  </span>
                </figcaption>
              </figure>
            </Card>
          ))}
        </div>
      </Container>
    </LandingSection>
  );
}
