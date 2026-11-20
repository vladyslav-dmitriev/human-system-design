import { cn } from "@/shared/lib/utils";

type AvatarVariant = "a" | "b" | "c";

const BACKGROUND: Record<AvatarVariant, string> = {
  a: "fill-border",
  b: "fill-muted-foreground/35",
  c: "fill-foreground/15",
};

type PersonAvatarProps = {
  variant?: AvatarVariant;
  className?: string;
};

/** Neutral placeholder portrait, drawn in the theme colours. */
export function PersonAvatar({ variant = "a", className }: PersonAvatarProps) {
  return (
    <svg
      viewBox="0 0 36 36"
      aria-hidden="true"
      className={cn("size-10 shrink-0", className)}
    >
      <circle className={BACKGROUND[variant]} cx={18} cy={18} r={18} />
      <circle className="fill-muted-foreground" cx={18} cy={14} r={6} />
      <path
        className="fill-muted-foreground"
        d="M6 31c1.5-6 6.5-9 12-9s10.5 3 12 9a18 18 0 0 1-24 0z"
      />
    </svg>
  );
}
