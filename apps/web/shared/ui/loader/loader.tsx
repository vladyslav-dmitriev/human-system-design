// components/ui/base-spinner.tsx
"use client";

import React from "react";
import { cn } from "../../lib/utils";

interface BaseSpinnerProps extends React.HTMLAttributes<HTMLDivElement> {
  fullPage?: boolean;
  size?: "sm" | "md" | "lg";
}

export const Loader: React.FC<BaseSpinnerProps> = ({
  fullPage = false,
  size = "md",
  className,
  ...props
}) => {
  const sizeClasses = {
    sm: "h-3.5 w-3.5 border-[1.5px]",
    md: "h-5 w-5 border-2",
    lg: "h-8 w-8 border-[2.5px]",
  };

  const spinnerContent = (
    <div
      className={cn(
        "relative flex items-center justify-center shrink-0",
        className,
      )}
      {...props}
    >
      {/* 1. Фиксированная фоновая подложка в цвет твоих muted-рамок */}
      <div
        className={cn(
          "rounded-full border-muted/30 absolute inset-0",
          sizeClasses[size],
        )}
      />
      {/* 2. Активный бегунок, окрашенный в цвет основного текста (foreground) */}
      <div
        className={cn(
          "rounded-full border-t-foreground border-r-transparent border-b-transparent border-l-transparent animate-spin inset-0",
          sizeClasses[size],
        )}
        style={{ animationDuration: "0.6s" }} // Мягкое быстрое вращение
      />
    </div>
  );

  if (fullPage) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/40 backdrop-blur-sm animate-in fade-in duration-150">
        {spinnerContent}
      </div>
    );
  }

  return spinnerContent;
};
