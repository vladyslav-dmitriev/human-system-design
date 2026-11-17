import { Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { cn } from "@/shared/lib/utils";
import { svg } from "./illustrations/styles";

const WEEK = [
  { day: "mon", height: 44 },
  { day: "tue", height: 66 },
  { day: "wed", height: 52 },
  { day: "thu", height: 88, active: true },
  { day: "fri", height: 72 },
  { day: "sat", height: 36 },
  { day: "sun", height: 56 },
] as const;

const FOCUS_PROGRESS = 72;
const RING_LENGTH = 2 * Math.PI * 38;

const CARD = "p-6 shadow-[0_30px_60px_-30px_rgba(0,0,0,0.25)]";

export function DashboardPreview() {
  const t = useTranslations("landing.dashboard");

  return (
    <div
      role="img"
      aria-label={t("label")}
      className="mx-auto flex max-w-[960px] flex-wrap gap-4 text-left"
    >
      <Card className={cn(CARD, "flex flex-[1.4_1_340px] flex-col gap-4")}>
        <div className="flex items-center justify-between gap-2">
          <span className="text-base font-semibold">{t("weeklyTitle")}</span>
          <Badge variant="outline">{t("weeklyBadge")}</Badge>
        </div>
        <div className="flex flex-wrap items-baseline gap-3">
          <span className="text-5xl font-bold leading-none tracking-tight">
            86%
          </span>
          <Badge variant="secondary">{t("weeklyDelta")}</Badge>
        </div>
        <p className="text-muted-foreground">{t("weeklyCaption")}</p>
        <svg viewBox="0 0 300 124" className="w-full" aria-hidden="true">
          {WEEK.map((item, index) => {
            const x = 12 + index * 40;

            return (
              <g key={item.day}>
                <rect
                  className={"active" in item ? svg.primary : svg.border}
                  x={x}
                  y={100 - item.height}
                  width={28}
                  height={item.height}
                  rx={6}
                />
                <text
                  className={svg.label}
                  x={x + 14}
                  y={118}
                  textAnchor="middle"
                >
                  {t(`days.${item.day}`)}
                </text>
              </g>
            );
          })}
        </svg>
      </Card>

      <div className="flex flex-[1_1_260px] flex-col gap-4">
        <Card className={cn(CARD, "flex items-center gap-5")}>
          <svg
            viewBox="0 0 96 96"
            className="size-24 shrink-0"
            aria-hidden="true"
          >
            <circle
              className="fill-none stroke-border"
              strokeWidth={10}
              cx={48}
              cy={48}
              r={38}
            />
            <circle
              className="fill-none stroke-primary [stroke-linecap:round]"
              strokeWidth={10}
              cx={48}
              cy={48}
              r={38}
              strokeDasharray={`${(RING_LENGTH * FOCUS_PROGRESS) / 100} ${RING_LENGTH}`}
              transform="rotate(-90 48 48)"
            />
            <text
              className="fill-foreground text-lg font-bold"
              x={48}
              y={54}
              textAnchor="middle"
            >
              {FOCUS_PROGRESS}%
            </text>
          </svg>
          <div>
            <div className="text-base font-semibold">{t("focusTitle")}</div>
            <div className="text-2xl font-bold">{t("focusValue")}</div>
            <div className="text-muted-foreground">{t("focusGoal")}</div>
          </div>
        </Card>

        <Card className={cn(CARD, "flex flex-col gap-3")}>
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-base font-semibold">{t("savedTitle")}</span>
            <span className="text-muted-foreground">{t("savedPeriod")}</span>
          </div>
          <div className="flex items-end justify-between gap-4">
            <span className="text-3xl font-bold leading-9">
              {t("savedValue")}
            </span>
            <svg
              viewBox="0 0 120 40"
              className="h-10 w-[120px]"
              aria-hidden="true"
            >
              <path
                className={svg.stroke}
                strokeWidth={2.5}
                d="M4 34 22 28l16 4 20-14 18 6 20-14 16-6"
              />
              <circle className={svg.primary} cx={116} cy={6} r={4} />
            </svg>
          </div>
        </Card>

        <Card className={cn(CARD, "flex flex-1 items-start gap-3")}>
          <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Sparkles className="size-4" aria-hidden="true" />
          </span>
          <div>
            <div className="text-base font-semibold">{t("aiTitle")}</div>
            <div className="text-muted-foreground">{t("aiText")}</div>
          </div>
        </Card>
      </div>
    </div>
  );
}
