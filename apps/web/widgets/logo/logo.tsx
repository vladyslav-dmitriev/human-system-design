"use client";

import { Layers } from "lucide-react";

export const Logo = () => {
  return (
    <div className="flex items-center gap-2.5 group select-none outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm transition-all">
      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-foreground text-background transition-transform group-hover:scale-105">
        <Layers className="h-4 w-4" strokeWidth={2.5} />
      </div>

      <span className="font-sans text-base font-bold tracking-tight text-foreground pl-1">
        Task<span className="text-muted-foreground font-medium">Flow</span>
      </span>
    </div>
  );
};
