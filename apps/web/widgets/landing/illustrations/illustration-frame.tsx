import * as React from "react";

import { cn } from "@/shared/lib/utils";

/** Soft muted tile that holds a 240x140 (or similar) SVG illustration. */
export function IllustrationFrame({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-lg bg-muted leading-none [&>svg]:block [&>svg]:h-auto [&>svg]:w-full",
        className,
      )}
      {...props}
    />
  );
}
