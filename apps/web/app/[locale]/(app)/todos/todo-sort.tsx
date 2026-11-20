"use client";

import * as React from "react";
import {
  ArrowUpDown,
  Calendar,
  ArrowUpAz,
  ArrowUpZa,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useTranslations } from "next-intl";

// Описываем типы для параметров, которые мы настроили на бэкенде
export interface SortOption {
  sortBy: "createdAt" | "title";
  sortOrder: "asc" | "desc";
}

interface TodoSortProps {
  value: SortOption;
  onChange: (value: SortOption) => void;
}

export function TodoSort({ value, onChange }: TodoSortProps) {
  const t = useTranslations();

  const getSortLabel = () => {
    if (value.sortBy === "createdAt") {
      return value.sortOrder === "desc" ? t("latest") : t("earliest");
    }

    return value.sortOrder === "asc" ? t("AtoZ") : t("ZtoA");
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="h-9 gap-2 w-45">
          <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
          <span>{getSortLabel()}</span>
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-45">
        <DropdownMenuLabel>{t("sorting")}</DropdownMenuLabel>
        <DropdownMenuSeparator />

        <DropdownMenuItem
          onClick={() => onChange({ sortBy: "createdAt", sortOrder: "desc" })}
          className={
            value.sortBy === "createdAt" && value.sortOrder === "desc"
              ? "bg-accent font-medium"
              : ""
          }
        >
          <Clock className="mr-2 h-4 w-4 text-muted-foreground" />
          <span>{t("latest")}</span>
        </DropdownMenuItem>

        {/* Опция: Сначала старые */}
        <DropdownMenuItem
          onClick={() => onChange({ sortBy: "createdAt", sortOrder: "asc" })}
          className={
            value.sortBy === "createdAt" && value.sortOrder === "asc"
              ? "bg-accent font-medium"
              : ""
          }
        >
          <Calendar className="mr-2 h-4 w-4 text-muted-foreground" />
          <span>{t("earliest")}</span>
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuItem
          onClick={() => onChange({ sortBy: "title", sortOrder: "asc" })}
          className={
            value.sortBy === "title" && value.sortOrder === "asc"
              ? "bg-accent font-medium"
              : ""
          }
        >
          <ArrowUpAz className="mr-2 h-4 w-4 text-muted-foreground" />
          <span>{t("AtoZ")}</span>
        </DropdownMenuItem>

        <DropdownMenuItem
          onClick={() => onChange({ sortBy: "title", sortOrder: "desc" })}
          className={
            value.sortBy === "title" && value.sortOrder === "desc"
              ? "bg-accent font-medium"
              : ""
          }
        >
          <ArrowUpZa className="mr-2 h-4 w-4 text-muted-foreground" />
          <span>{t("ZtoA")}</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
