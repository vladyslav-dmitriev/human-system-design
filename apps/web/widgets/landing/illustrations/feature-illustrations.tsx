import { useTranslations } from "next-intl";

import { cn } from "@/shared/lib/utils";
import { svg } from "./styles";

export function TasksIllustration() {
  const t = useTranslations("landing.illustrations.tasks");

  return (
    <svg viewBox="0 0 240 140" role="img" aria-label={t("label")}>
      <rect
        className={svg.card}
        x={20}
        y={16}
        width={200}
        height={108}
        rx={10}
      />
      <rect
        className={svg.primary}
        x={34}
        y={32}
        width={14}
        height={14}
        rx={3}
      />
      <path
        className={svg.strokeOnPrimary}
        d="m37 39 3 3 5-6"
        strokeWidth={1.6}
      />
      <rect className={svg.border} x={56} y={36} width={64} height={6} rx={3} />
      <rect
        className={svg.outline}
        x={34}
        y={60}
        width={14}
        height={14}
        rx={3}
        strokeWidth={1.5}
      />
      <rect className={svg.border} x={56} y={64} width={86} height={6} rx={3} />
      <rect
        className={svg.outline}
        x={34}
        y={88}
        width={14}
        height={14}
        rx={3}
        strokeWidth={1.5}
      />
      <rect className={svg.border} x={56} y={92} width={52} height={6} rx={3} />
      <rect
        className={svg.border}
        x={150}
        y={30}
        width={56}
        height={44}
        rx={6}
      />
      <circle className={svg.card} cx={166} cy={44} r={5} />
      <path
        className={cn(svg.muted, "opacity-70")}
        d="M150 74v-9l16-12 12 9 8-6 20 14v4z"
      />
      <rect
        className={svg.primary}
        x={150}
        y={86}
        width={56}
        height={20}
        rx={6}
      />
      <text
        className={cn(svg.onPrimary, "text-[10px] font-semibold")}
        x={178}
        y={100}
        textAnchor="middle"
      >
        {t("sort")}
      </text>
    </svg>
  );
}

export function BriefingIllustration() {
  const t = useTranslations("landing.illustrations.briefing");

  return (
    <svg viewBox="0 0 240 140" role="img" aria-label={t("label")}>
      <rect
        className={svg.card}
        x={20}
        y={14}
        width={200}
        height={112}
        rx={10}
      />
      <circle className={svg.stroke} cx={40} cy={34} r={5} strokeWidth={2} />
      <text
        className={cn(svg.foreground, "text-[11px] font-semibold")}
        x={54}
        y={38}
      >
        {t("heading")}
      </text>
      <rect
        className={svg.border}
        x={34}
        y={56}
        width={150}
        height={6}
        rx={3}
      />
      <rect
        className={svg.border}
        x={34}
        y={72}
        width={118}
        height={6}
        rx={3}
      />
      <rect
        className={svg.border}
        x={34}
        y={88}
        width={136}
        height={6}
        rx={3}
      />
      <rect
        className={svg.primary}
        x={34}
        y={104}
        width={78}
        height={14}
        rx={7}
      />
      <text
        className={cn(svg.onPrimary, "text-[9px] font-semibold")}
        x={73}
        y={114}
        textAnchor="middle"
      >
        {t("badge")}
      </text>
    </svg>
  );
}

export function InsightsIllustration() {
  const t = useTranslations("landing.illustrations.insights");

  return (
    <svg viewBox="0 0 240 140" role="img" aria-label={t("label")}>
      <rect
        className={svg.card}
        x={20}
        y={14}
        width={200}
        height={112}
        rx={10}
      />
      <path
        className={svg.dashed}
        d="M34 54h172M34 78h172M34 102h172"
        strokeWidth={1.5}
        strokeDasharray="4 4"
      />
      <path
        className={svg.stroke}
        d="M34 104 70 86l34 8 36-32 36 6 30-28"
        strokeWidth={2.5}
      />
      <circle className={svg.primary} cx={206} cy={40} r={5} />
      <rect
        className={svg.primary}
        x={32}
        y={26}
        width={46}
        height={16}
        rx={8}
      />
      <text
        className={cn(svg.onPrimary, "text-[10px] font-semibold")}
        x={55}
        y={37}
        textAnchor="middle"
      >
        {t("badge")}
      </text>
    </svg>
  );
}

export function NudgesIllustration() {
  const t = useTranslations("landing.illustrations.nudges");

  return (
    <svg viewBox="0 0 240 140" role="img" aria-label={t("label")}>
      <rect
        className={svg.card}
        x={24}
        y={18}
        width={192}
        height={46}
        rx={10}
      />
      <circle className={svg.primary} cx={48} cy={41} r={12} />
      <g transform="translate(40 33) scale(.67)">
        <path
          className={svg.strokeOnPrimary}
          strokeWidth={2}
          d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"
        />
        <path
          className={svg.strokeOnPrimary}
          strokeWidth={2}
          d="M10.3 21a1.94 1.94 0 0 0 3.4 0"
        />
      </g>
      <text
        className={cn(svg.foreground, "text-[11px] font-semibold")}
        x={68}
        y={38}
      >
        {t("title")}
      </text>
      <text className={svg.label} x={68} y={53}>
        {t("detail")}
      </text>
      <rect
        className={svg.card}
        x={40}
        y={76}
        width={176}
        height={42}
        rx={10}
      />
      <rect className={svg.border} x={54} y={90} width={90} height={6} rx={3} />
      <rect
        className={svg.border}
        x={54}
        y={102}
        width={60}
        height={6}
        rx={3}
      />
      <rect
        className={svg.primary}
        x={164}
        y={88}
        width={40}
        height={18}
        rx={9}
      />
      <text
        className={cn(svg.onPrimary, "text-[9px] font-semibold")}
        x={184}
        y={100}
        textAnchor="middle"
      >
        {t("snooze")}
      </text>
    </svg>
  );
}

export function SyncIllustration() {
  const t = useTranslations("landing.illustrations.sync");

  return (
    <svg viewBox="0 0 240 140" role="img" aria-label={t("label")}>
      <g transform="translate(72 8) scale(4)">
        <path
          className="fill-card stroke-foreground [stroke-linejoin:round]"
          strokeWidth={0.45}
          d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z"
        />
      </g>
      <path
        className="fill-none stroke-muted-foreground"
        d="M120 88 62 100M120 88v16M120 88l74 12"
        strokeWidth={1.5}
        strokeDasharray="3 3"
      />
      <rect className={svg.card} x={54} y={100} width={16} height={26} rx={3} />
      <rect className={svg.card} x={98} y={104} width={44} height={22} rx={3} />
      <rect
        className={svg.card}
        x={180}
        y={100}
        width={26}
        height={26}
        rx={4}
      />
    </svg>
  );
}

const MONO = "font-mono";

export function ApiIllustration() {
  const t = useTranslations("landing.illustrations.api");

  return (
    <svg viewBox="0 0 240 140" role="img" aria-label={t("label")}>
      <rect
        className={svg.card}
        x={20}
        y={14}
        width={200}
        height={112}
        rx={10}
      />
      <circle className={svg.border} cx={34} cy={28} r={3.5} />
      <circle className={svg.border} cx={46} cy={28} r={3.5} />
      <circle className={svg.border} cx={58} cy={28} r={3.5} />
      <text
        className={cn(svg.foreground, MONO, "text-[11px] font-semibold")}
        x={34}
        y={56}
      >
        POST /api/tasks
      </text>
      <text className={cn(svg.muted, MONO, "text-[10px]")} x={34} y={74}>
        {'{ "title": "Plan sprint",'}
      </text>
      <text className={cn(svg.muted, MONO, "text-[10px]")} x={46} y={90}>
        {'"ai": true }'}
      </text>
      <rect
        className={svg.primary}
        x={34}
        y={102}
        width={58}
        height={16}
        rx={8}
      />
      <text
        className={cn(svg.onPrimary, "text-[9px] font-semibold")}
        x={63}
        y={113}
        textAnchor="middle"
      >
        200 OK
      </text>
    </svg>
  );
}
