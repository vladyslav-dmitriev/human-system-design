import * as React from "react";
import { useTranslations } from "next-intl";

import { Container, LandingSection } from "./landing-section";

type Glyph = () => React.ReactElement;

const COMPANIES: { name: string; className: string; Glyph: Glyph }[] = [
  {
    name: "Lumina",
    className: "font-bold",
    Glyph: () => (
      <circle
        cx={12}
        cy={12}
        r={9}
        fill="none"
        stroke="currentColor"
        strokeWidth={3}
      />
    ),
  },
  {
    name: "Northwind",
    className: "font-medium tracking-wide",
    Glyph: () => <path d="M12 3 22 21H2z" />,
  },
  {
    name: "Brightly",
    className: "font-semibold",
    Glyph: () => (
      <>
        <rect x={3} y={3} width={8} height={8} rx={2} />
        <rect x={13} y={13} width={8} height={8} rx={2} />
      </>
    ),
  },
  {
    name: "Stackform",
    className: "font-bold tracking-tight",
    Glyph: () => (
      <>
        <rect x={3} y={4} width={18} height={4} rx={2} />
        <rect x={3} y={10} width={14} height={4} rx={2} />
        <rect x={3} y={16} width={10} height={4} rx={2} />
      </>
    ),
  },
  {
    name: "Orbital",
    className: "font-medium",
    Glyph: () => (
      <>
        <circle cx={12} cy={12} r={4} />
        <ellipse
          cx={12}
          cy={12}
          rx={10}
          ry={4}
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          transform="rotate(-30 12 12)"
        />
      </>
    ),
  },
];

const STATS = ["tasks", "countries", "rating"] as const;

export function LandingSocialProof() {
  const t = useTranslations("landing.social");

  return (
    <LandingSection tone="muted" className="py-10 md:py-10">
      <Container className="flex flex-col items-center gap-8 text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.08em] text-foreground/70">
          {t("eyebrow")}
        </p>

        <ul className="grid w-full grid-cols-[repeat(auto-fit,minmax(140px,1fr))] gap-6 text-foreground/70">
          {COMPANIES.map(({ name, className, Glyph }) => (
            <li
              key={name}
              className={`flex h-11 items-center justify-center gap-2 text-lg ${className}`}
            >
              <svg
                viewBox="0 0 24 24"
                className="size-[22px]"
                fill="currentColor"
                aria-hidden="true"
              >
                <Glyph />
              </svg>
              {name}
            </li>
          ))}
        </ul>

        <ul className="grid w-full max-w-3xl grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-6">
          {STATS.map((stat) => (
            <li key={stat}>
              <span className="block text-3xl font-bold leading-9">
                {t(`stats.${stat}.value`)}
              </span>
              <span className="block text-foreground/70">
                {t(`stats.${stat}.label`)}
              </span>
            </li>
          ))}
        </ul>
      </Container>
    </LandingSection>
  );
}
