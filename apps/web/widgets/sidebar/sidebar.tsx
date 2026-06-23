"use client";

import React from "react";
import { Gem, CheckSquare, CreditCard, Settings } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "../logo";
import { ROUTE } from "@/constants";
import { useTranslations } from "next-intl";

interface AppSidebarProps {
  isOpen: boolean;
}

export function AppSidebar({ isOpen }: AppSidebarProps) {
  const pathname = usePathname();

  const t = useTranslations();

  const mainItems = [
    { title: t("todos"), url: ROUTE.TODOS, icon: CheckSquare },
  ];

  const systemItems = [
    { title: t("prices"), url: ROUTE.PRICING, icon: Gem },
    { title: t("billing"), url: ROUTE.BILLING, icon: CreditCard },
    { title: t("settings"), url: ROUTE.SETTINGS, icon: Settings },
  ];

  return (
    <aside
      className={`fixed top-0 left-0 h-screen bg-card/50 backdrop-blur-md border-r border-border flex flex-col justify-between z-20 transition-all duration-300 ease-in-out ${
        isOpen ? "w-40" : "w-13"
      }`}
    >
      <div>
        <div className="h-14 flex items-center px-2.5 border-b border-muted/30 overflow-hidden">
          <Link href={ROUTE.HOME}>
            <Logo />
          </Link>
        </div>

        <nav className="p-2 space-y-0.5">
          {mainItems.map((item) => {
            const isActive = pathname.includes(item.url);

            return (
              <Link
                key={item.title}
                href={item.url}
                className={`flex items-center gap-3 px-2.5 py-2 rounded-md text-sm font-medium transition-all group relative ${
                  isActive
                    ? "bg-primary/5 text-primary font-semibold"
                    : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                }`}
              >
                {isActive && (
                  <div className="absolute left-0 top-1.5 bottom-1.5 w-0.5 bg-primary rounded-r-full" />
                )}

                <item.icon
                  className={`h-4 w-4 shrink-0 transition-transform group-hover:scale-105 ${isActive ? "text-primary" : "text-muted-foreground/80 group-hover:text-foreground"}`}
                />

                <span
                  className={`transition-all duration-300 text-[13px] ${
                    isOpen
                      ? "opacity-100 translate-x-0"
                      : "opacity-0 w-0 h-0 overflow-hidden -translate-x-2"
                  }`}
                >
                  {item.title}
                </span>

                {!isOpen && (
                  <span className="absolute left-12 bg-popover/95 backdrop-blur-sm text-popover-foreground text-xs font-medium px-2.5 py-1.5 rounded-md shadow-lg border border-border/60 opacity-0 group-hover:opacity-100 transition-all duration-200 translate-x-2 group-hover:translate-x-0 whitespace-nowrap z-30 pointer-events-none">
                    {item.title}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="p-2 pb-8 border-t border-muted/30 space-y-0.5 bg-muted/10">
        {systemItems.map((item) => {
          const isActive = pathname.includes(item.url);

          return (
            <Link
              key={item.title}
              href={item.url}
              className={`flex items-center gap-3 px-2.5 py-2 rounded-md text-sm font-medium transition-all group relative ${
                isActive
                  ? "bg-primary/5 text-primary font-semibold"
                  : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
              }`}
            >
              {isActive && (
                <div className="absolute left-0 top-1.5 bottom-1.5 w-0.5 bg-primary rounded-r-full" />
              )}

              <item.icon
                className={`h-4 w-4 shrink-0 transition-transform group-hover:scale-105 ${isActive ? "text-primary" : "text-muted-foreground/80 group-hover:text-foreground"}`}
              />

              <span
                className={`transition-all duration-300 text-[13px] ${
                  isOpen
                    ? "opacity-100 translate-x-0"
                    : "opacity-0 w-0 h-0 overflow-hidden -translate-x-2"
                }`}
              >
                {item.title}
              </span>

              {!isOpen && (
                <span className="absolute left-12 bg-popover/95 backdrop-blur-sm text-popover-foreground text-xs font-medium px-2.5 py-1.5 rounded-md shadow-lg border border-border/60 opacity-0 group-hover:opacity-100 transition-all duration-200 translate-x-2 group-hover:translate-x-0 whitespace-nowrap z-30 pointer-events-none">
                  {item.title}
                </span>
              )}
            </Link>
          );
        })}
      </div>
    </aside>
  );
}
