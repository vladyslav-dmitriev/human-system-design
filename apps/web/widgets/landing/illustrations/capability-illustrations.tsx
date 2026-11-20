import { useTranslations } from "next-intl";

import { cn } from "@/shared/lib/utils";
import { svg } from "./styles";

const NODE_LABEL = cn(svg.foreground, "text-[10px] font-medium");

export function GoalsIllustration() {
  const t = useTranslations("landing.illustrations.goals");
  const children = [
    { x: 22, label: t("draft"), progress: svg.primary, extra: 40 },
    { x: 90, label: t("review"), progress: svg.border, extra: 48 },
    { x: 158, label: t("ship"), progress: svg.border, extra: 34 },
  ];

  return (
    <svg viewBox="0 0 240 140" role="img" aria-label={t("label")}>
      <rect
        className={svg.primary}
        x={82}
        y={14}
        width={76}
        height={26}
        rx={8}
      />
      <text
        className={cn(svg.onPrimary, "text-[11px] font-semibold")}
        x={120}
        y={31}
        textAnchor="middle"
      >
        {t("root")}
      </text>
      <path
        className="fill-none stroke-muted-foreground [stroke-linecap:round] [stroke-linejoin:round]"
        d="M120 40v12M52 52h136M52 52v14M120 52v14M188 52v14"
        strokeWidth={1.5}
      />
      {children.map((child) => (
        <g key={child.x}>
          <rect
            className={svg.card}
            x={child.x}
            y={66}
            width={60}
            height={24}
            rx={7}
          />
          <text
            className={NODE_LABEL}
            x={child.x + 30}
            y={82}
            textAnchor="middle"
          >
            {child.label}
          </text>
          <rect
            className={child.progress}
            x={child.x}
            y={104}
            width={60}
            height={6}
            rx={3}
          />
          <rect
            className={svg.border}
            x={child.x}
            y={116}
            width={child.extra}
            height={6}
            rx={3}
          />
        </g>
      ))}
    </svg>
  );
}

export function PrioritiesIllustration() {
  const t = useTranslations("landing.illustrations.priorities");
  const rows = [
    { y: 16, line: 84, score: "98", primary: true },
    { y: 54, line: 64, score: "74", primary: false },
    { y: 92, line: 100, score: "41", primary: false },
  ];

  return (
    <svg viewBox="0 0 240 140" role="img" aria-label={t("label")}>
      {rows.map((row) => (
        <g key={row.score}>
          <rect
            className={svg.card}
            x={20}
            y={row.y}
            width={200}
            height={32}
            rx={8}
          />
          <rect
            className={svg.border}
            x={32}
            y={row.y + 13}
            width={row.line}
            height={6}
            rx={3}
          />
          <rect
            className={row.primary ? svg.primary : svg.border}
            x={168}
            y={row.y + 8}
            width={40}
            height={16}
            rx={8}
          />
          <text
            className={cn(
              row.primary ? svg.onPrimary : svg.foreground,
              "text-[10px] font-semibold",
            )}
            x={188}
            y={row.y + 20}
            textAnchor="middle"
          >
            {row.score}
          </text>
        </g>
      ))}
    </svg>
  );
}

export function ScheduleIllustration() {
  const t = useTranslations("landing.illustrations.schedule");

  return (
    <svg viewBox="0 0 240 140" role="img" aria-label={t("label")}>
      <text className={svg.label} x={20} y={31}>
        9:00
      </text>
      <rect
        className={svg.primary}
        x={56}
        y={14}
        width={164}
        height={30}
        rx={8}
      />
      <text
        className={cn(svg.onPrimary, "text-[11px] font-semibold")}
        x={70}
        y={33}
      >
        {t("deepWork")}
      </text>
      <text className={svg.label} x={20} y={69}>
        11:00
      </text>
      <rect className={svg.card} x={56} y={52} width={110} height={26} rx={8} />
      <text
        className={cn(svg.foreground, "text-[11px] font-medium")}
        x={70}
        y={69}
      >
        {t("clientCall")}
      </text>
      <text className={svg.label} x={20} y={103}>
        13:00
      </text>
      <rect
        className={svg.border}
        x={56}
        y={86}
        width={140}
        height={26}
        rx={8}
      />
      <text
        className={cn(svg.foreground, "text-[11px] font-medium")}
        x={70}
        y={103}
      >
        {t("reviewTasks")}
      </text>
      <path
        className={svg.dashed}
        d="M20 124h200"
        strokeWidth={1.5}
        strokeDasharray="4 4"
      />
    </svg>
  );
}
