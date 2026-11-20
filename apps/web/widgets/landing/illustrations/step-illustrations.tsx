import { useTranslations } from "next-intl";

import { cn } from "@/shared/lib/utils";
import { svg } from "./styles";

export function SignupIllustration() {
  const t = useTranslations("landing.illustrations.signup");

  return (
    <svg viewBox="0 0 300 110" role="img" aria-label={t("label")}>
      <rect className={svg.card} x={30} y={12} width={240} height={22} rx={6} />
      <rect className={svg.border} x={42} y={20} width={70} height={6} rx={3} />
      <rect className={svg.card} x={30} y={42} width={240} height={22} rx={6} />
      <rect className={svg.border} x={42} y={50} width={52} height={6} rx={3} />
      <rect
        className={svg.primary}
        x={30}
        y={74}
        width={240}
        height={26}
        rx={6}
      />
      <text
        className={cn(svg.onPrimary, "text-[11px] font-semibold")}
        x={150}
        y={91}
        textAnchor="middle"
      >
        {t("button")}
      </text>
    </svg>
  );
}

export function PromptIllustration() {
  const t = useTranslations("landing.illustrations.prompt");
  const chips = [
    { x: 30, width: 76, label: t("launch") },
    { x: 112, width: 62, label: t("pricing") },
    { x: 180, width: 80, label: t("call") },
  ];

  return (
    <svg viewBox="0 0 300 110" role="img" aria-label={t("label")}>
      <rect
        className={svg.card}
        x={30}
        y={12}
        width={240}
        height={38}
        rx={10}
      />
      <g transform="translate(42 22) scale(.7)">
        <path
          className={svg.stroke}
          strokeWidth={2}
          d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z"
        />
      </g>
      <rect
        className={svg.border}
        x={68}
        y={28}
        width={130}
        height={6}
        rx={3}
      />
      <rect
        className={svg.primary}
        x={228}
        y={20}
        width={30}
        height={22}
        rx={6}
      />
      <path
        className={svg.strokeOnPrimary}
        d="M237 31h12m-5-5 5 5-5 5"
        strokeWidth={1.8}
      />
      {chips.map((chip) => (
        <g key={chip.x}>
          <rect
            className={svg.card}
            x={chip.x}
            y={64}
            width={chip.width}
            height={24}
            rx={12}
          />
          <text
            className={cn(svg.foreground, "text-[10px] font-medium")}
            x={chip.x + chip.width / 2}
            y={80}
            textAnchor="middle"
          >
            {chip.label}
          </text>
        </g>
      ))}
    </svg>
  );
}

export function PlanIllustration() {
  const t = useTranslations("landing.illustrations.plan");

  return (
    <svg viewBox="0 0 300 110" role="img" aria-label={t("label")}>
      <text className={svg.label} x={30} y={27}>
        09:00
      </text>
      <rect
        className={svg.primary}
        x={72}
        y={10}
        width={198}
        height={26}
        rx={8}
      />
      <rect
        className={cn(svg.onPrimary, "opacity-85")}
        x={84}
        y={20}
        width={90}
        height={6}
        rx={3}
      />
      <rect
        className={cn(svg.onPrimary, "opacity-50")}
        x={224}
        y={19}
        width={34}
        height={8}
        rx={4}
      />
      <text className={svg.label} x={30} y={59}>
        11:00
      </text>
      <rect className={svg.card} x={72} y={42} width={150} height={26} rx={8} />
      <rect className={svg.border} x={84} y={52} width={80} height={6} rx={3} />
      <text className={svg.label} x={30} y={91}>
        14:00
      </text>
      <rect className={svg.card} x={72} y={74} width={180} height={26} rx={8} />
      <rect
        className={svg.border}
        x={84}
        y={84}
        width={110}
        height={6}
        rx={3}
      />
    </svg>
  );
}
