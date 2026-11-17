import { Star } from "lucide-react";

import { cn } from "@/shared/lib/utils";

type StarRatingProps = {
  label: string;
  className?: string;
};

export function StarRating({ label, className }: StarRatingProps) {
  return (
    <div
      role="img"
      aria-label={label}
      className={cn("flex gap-0.5", className)}
    >
      {Array.from({ length: 5 }, (_, index) => (
        <Star
          key={index}
          aria-hidden="true"
          className="size-4 fill-foreground stroke-foreground"
        />
      ))}
    </div>
  );
}
