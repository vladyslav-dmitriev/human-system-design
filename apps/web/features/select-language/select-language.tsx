"use client";

import { useLocale } from "next-intl";
import { useRouter, usePathname } from "@/i18n/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Locale = "en" | "uk";

const locales: Record<Locale, { label: string; flag: string }> = {
  en: { label: "EN", flag: "🇺🇸" },
  uk: { label: "UA", flag: "🇺🇦" },
};

export function SelectLanguage() {
  const locale = useLocale() as Locale;
  const router = useRouter();
  const pathname = usePathname();

  const onChange = (nextLocale: Locale) => {
    router.replace(pathname, { locale: nextLocale });
  };

  return (
    <Select value={locale} onValueChange={onChange}>
      <SelectTrigger
        className="
          w-auto min-w-0 h-8 gap-1.5 px-2 bg-transparent border-none shadow-none hover:bg-muted 
          [&>svg]:hidden 
          focus:ring-0 focus:ring-offset-0
        "
      >
        <SelectValue />
      </SelectTrigger>

      <SelectContent
        className="w-auto min-w-[60px] p-0.5 bg-popover border rounded-md shadow-md"
        align="end"
      >
        {(Object.keys(locales) as Locale[]).map((key, index, arr) => (
          <SelectItem
            key={key}
            value={key}
            className={`
        relative flex items-center justify-center h-8 px-2 py-1.5 text-sm rounded-sm select-none outline-none transition-colors
        [&>span:first-child]:hidden 
        
        data-[state=checked]:bg-muted 
        data-[state=checked]:text-foreground 
        data-[state=checked]:font-medium
        
        data-[state=unchecked]:text-muted-foreground
        hover:bg-muted/50

        /* 🔑 Если это не последний элемент в массиве, добавляем отступ вниз */
        ${index !== arr.length - 1 ? "mb-1" : "mb-0"}
      `}
          >
            <div className="flex items-center gap-1.5">
              <span className="text-base leading-none">
                {locales[key].flag}
              </span>
              <span className="text-xs font-medium tracking-wide">
                {locales[key].label}
              </span>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
