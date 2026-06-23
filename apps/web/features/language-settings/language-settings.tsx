"use client";

import React from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter, usePathname } from "@/i18n/navigation";
import { Globe } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Locale = "en" | "uk";

const locales: Record<Locale, { label: string; flag: string }> = {
  en: { label: "English", flag: "🇺🇸" },
  uk: { label: "Українська", flag: "🇺🇦" },
};

export function LanguageSettings() {
  const locale = useLocale() as Locale;
  const router = useRouter();
  const pathname = usePathname();
  const t = useTranslations();

  const onChange = (nextLocale: Locale) => {
    router.replace(pathname, { locale: nextLocale });
  };

  return (
    <div className="w-full p-5 bg-white dark:bg-zinc-950 border border-muted/60 rounded-xl shadow-[0_8px_30px_rgb(0,0,0,0.02)] transition-all duration-200">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-5">
        {/* Левая часть: Название и описание с вертикальной структурой */}
        <div className="flex flex-col space-y-3 flex-1 pl-0.5">
          {/* Верхняя строка: Иконка + Заголовок */}
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-secondary/50 rounded-md border border-muted/40 shrink-0">
              <Globe className="h-3.5 w-3.5 text-muted-foreground/80 stroke-[1.5]" />
            </div>
            <span className="text-md font-semibold tracking-tight text-foreground/90">
              {t("language_title")}
            </span>
          </div>

          {/* Нижняя строка: Описание строго под иконкой и заголовком */}
          <span className="text-sm text-muted-foreground/70 leading-normal max-w-[95%] sm:max-w-[85%] pl-1">
            {t("language_description")}
          </span>
        </div>

        {/* Правая часть: Селект выбора языка */}
        <div className="w-full sm:w-auto shrink-0 pt-0.5">
          <Select value={locale} onValueChange={onChange}>
            <SelectTrigger className="w-full sm:w-40 h-9 px-3 rounded-lg font-medium text-[12px] bg-secondary text-foreground border border-muted/40 hover:bg-foreground hover:text-background hover:border-foreground transition-all duration-200 focus:ring-0 focus:ring-offset-0 flex items-center justify-between gap-2">
              <SelectValue />
            </SelectTrigger>

            <SelectContent
              className="p-1 bg-popover/95 backdrop-blur-md border border-muted/50 rounded-xl shadow-[0_10px_30px_rgba(0,0,0,0.04)] min-w-[160px]"
              align="end"
            >
              {(Object.keys(locales) as Locale[]).map((key) => (
                <SelectItem
                  key={key}
                  value={key}
                  className="
                    relative flex items-center h-8.5 px-2.5 text-[12px] rounded-lg select-none outline-none transition-colors my-0.5
                    [&>span:first-child]:hidden
                    data-[state=checked]:bg-foreground data-[state=checked]:text-background data-[state=checked]:font-medium
                    data-[state=unchecked]:text-muted-foreground hover:bg-muted/60
                  "
                >
                  <div className="flex items-center gap-2">
                    <span className="text-sm leading-none shrink-0">
                      {locales[key].flag}
                    </span>
                    <span className="tracking-wide">{locales[key].label}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}
