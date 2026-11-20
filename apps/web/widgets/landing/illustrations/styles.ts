/**
 * Tailwind class names for the inline SVG illustrations. They use the theme
 * tokens (not hard-coded colours), so the artwork follows light and dark mode.
 */
const ROUND = "[stroke-linecap:round] [stroke-linejoin:round]";

export const svg = {
  card: "fill-card stroke-border",
  border: "fill-border",
  muted: "fill-muted-foreground",
  primary: "fill-primary",
  onPrimary: "fill-primary-foreground",
  foreground: "fill-foreground",
  outline: "fill-none stroke-muted-foreground",
  stroke: `fill-none stroke-foreground ${ROUND}`,
  strokeOnPrimary: `fill-none stroke-primary-foreground ${ROUND}`,
  dashed: "fill-none stroke-border",
  label: "fill-muted-foreground text-[10px] font-medium",
} as const;
