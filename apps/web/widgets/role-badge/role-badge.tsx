"use client";

import { Badge } from "@/components/ui/badge";

type RoleBadgeProps = {
  text: string;
};

export function RoleBadge({ text }: RoleBadgeProps) {
  return (
    <Badge
      variant="outline"
      className="inline-flex items-center text-slate-950 font-semibold rounded-md px-3 py-0 text-[11px] uppercase tracking-wider select-none align-middle"
    >
      {text}
    </Badge>
  );
}
