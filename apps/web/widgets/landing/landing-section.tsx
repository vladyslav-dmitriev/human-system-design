import * as React from "react";

import { cn } from "@/shared/lib/utils";

export function Container({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      className={cn("mx-auto w-full max-w-[1120px] px-6", className)}
      {...props}
    />
  );
}

type Tone = "default" | "muted";

type LandingSectionProps = React.ComponentProps<"section"> & {
  tone?: Tone;
};

export function LandingSection({
  tone = "default",
  className,
  ...props
}: LandingSectionProps) {
  return (
    <section
      className={cn(
        "py-14 md:py-24",
        tone === "muted" && "border-y bg-muted",
        className,
      )}
      {...props}
    />
  );
}

type SectionHeadingProps = {
  eyebrow: React.ReactNode;
  title: React.ReactNode;
  description?: React.ReactNode;
  tone?: Tone;
  align?: "start" | "center";
  className?: string;
};

export function SectionHeading({
  eyebrow,
  title,
  description,
  tone = "default",
  align = "start",
  className,
}: SectionHeadingProps) {
  // Text on the muted background needs a bit more contrast than muted-foreground.
  const softText =
    tone === "muted" ? "text-foreground/70" : "text-muted-foreground";

  return (
    <div
      className={cn(
        "flex max-w-2xl flex-col gap-2",
        align === "center" && "items-center text-center",
        className,
      )}
    >
      <span
        className={cn(
          "inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.08em]",
          softText,
        )}
      >
        {eyebrow}
      </span>
      <h2 className="text-3xl font-bold leading-9 tracking-tight">{title}</h2>
      {description ? <p className={softText}>{description}</p> : null}
    </div>
  );
}
