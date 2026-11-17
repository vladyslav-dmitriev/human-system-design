import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { ROUTE } from "@/constants";
import { Link } from "@/i18n/navigation";
import { Container, LandingSection } from "./landing-section";

const RINGS_LARGE = [60, 100, 140, 176];
const RINGS_SMALL = [50, 90, 126];

function Rings({ radii, size }: { radii: number[]; size: number }) {
  const center = size / 2;

  return (
    <svg
      aria-hidden="true"
      viewBox={`0 0 ${size} ${size}`}
      width={size}
      height={size}
      className="absolute opacity-[0.12]"
    >
      {radii.map((radius) => (
        <circle
          key={radius}
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
        />
      ))}
    </svg>
  );
}

export function LandingCta() {
  const t = useTranslations("landing.cta");

  return (
    <LandingSection>
      <Container>
        <div className="relative flex flex-col items-center gap-4 overflow-hidden rounded-xl bg-primary px-8 py-14 text-center text-primary-foreground">
          <div className="pointer-events-none absolute -right-[120px] -top-[120px]">
            <Rings radii={RINGS_LARGE} size={360} />
          </div>
          <div className="pointer-events-none absolute -bottom-[110px] -left-[100px]">
            <Rings radii={RINGS_SMALL} size={260} />
          </div>

          <span className="relative inline-flex h-5 items-center rounded-md border border-primary-foreground/40 px-2.5 text-xs font-semibold">
            {t("badge")}
          </span>
          <h2 className="relative max-w-[560px] text-3xl font-bold leading-9 tracking-tight">
            {t("title")}
          </h2>
          <p className="relative max-w-[480px] opacity-80">
            {t("description")}
          </p>
          <Button
            asChild
            size="lg"
            variant="secondary"
            // "!" beats the global `a { color: inherit }` rule in globals.css
            className="relative mt-2 h-11 bg-primary-foreground text-primary! hover:bg-primary-foreground/90"
          >
            <Link href={ROUTE.CREATE_ACCOUNT}>{t("button")}</Link>
          </Button>
          <p className="relative text-xs leading-4 opacity-70">{t("note")}</p>
        </div>
      </Container>
    </LandingSection>
  );
}
