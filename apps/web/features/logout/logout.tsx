"use client";

import React, { useState } from "react";
import { LogOut, Loader2, ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { signOut } from "next-auth/react";
import { ROUTE } from "@/constants";
import { useTranslations } from "next-intl";

export function Logout() {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const t = useTranslations();

  const handleLogout = async () => {
    setIsLoading(true);

    await signOut();

    router.replace(ROUTE.LOGIN);
    router.refresh();

    setIsLoading(false);
  };

  return (
    <div className="w-full p-5 bg-white dark:bg-zinc-950 border border-muted/60 rounded-xl shadow-[0_8px_30px_rgb(0,0,0,0.02)] transition-all duration-200">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-5">
        <div className="flex flex-col space-y-3 flex-1 pl-0.5">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-secondary/50 rounded-md border border-muted/40 shrink-0">
              <LogOut className="h-3.5 w-3.5 text-muted-foreground/80 stroke-[1.5]" />
            </div>
            <span className="text-md font-semibold tracking-tight text-foreground/90">
              {t("session_title")}
            </span>
          </div>

          <span className="text-sm text-muted-foreground/70 leading-normal max-w-[95%] sm:max-w-[85%] pl-1">
            {t("session_description")}
          </span>
        </div>

        <div className="w-full sm:w-auto shrink-0 pt-0.5">
          <Button
            type="button"
            disabled={isLoading}
            onClick={handleLogout}
            className="w-full sm:w-auto h-9 px-4 rounded-lg font-medium text-[12px] bg-secondary text-foreground border border-muted/40 hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center group"
          >
            {isLoading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
            ) : (
              <span className="flex items-center gap-1.5">
                {t("session_logout_button")}
                <ArrowRight className="h-3 w-3 opacity-60 transition-transform duration-200 group-hover:translate-x-0.5" />
              </span>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
