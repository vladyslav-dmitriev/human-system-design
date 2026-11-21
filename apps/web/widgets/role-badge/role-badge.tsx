"use client";

import { Badge } from "@/components/ui/badge";

type RoleBadgeProps = {
  text: string;
};

export function RoleBadge({ text }: RoleBadgeProps) {
  return (
    <Badge
      variant="outline"
      className="inline-flex items-center text-foreground font-semibold rounded-md px-3 py-0 text-xs uppercase tracking-wider select-none align-middle"
    >
      {text}
    </Badge>
  );
}
