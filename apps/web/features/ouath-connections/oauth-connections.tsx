"use client";

import React, { useState } from "react";
import {
  Link2,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Github,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { useTranslations } from "next-intl";

// Иконка Google (можно использовать библиотеку или SVG)
const GoogleIcon = () => (
  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
    <path d="M5.84 14.09c-.22-.66-.35-1.38-.35-2.11s.13-1.45.35-2.11V7.03H2.18C1.43 8.55 1 10.24 1 12s.43 3.45 1.18 4.97l3.66-2.88z" />
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.03l3.66 2.88c.87-2.6 3.3-4.53 6.16-4.53z" />
  </svg>
);

interface OAuthProps {
  initialProviders: {
    google: boolean;
    github: boolean;
  };
}

export function OAuthConnections({ initialProviders }: OAuthProps) {
  const t = useTranslations();
  const [providers, setProviders] = useState(initialProviders);
  const [loading, setLoading] = useState<string | null>(null);

  const handleToggle = async (provider: "google" | "github") => {
    setLoading(provider);

    // Имитация API-запроса
    await new Promise((resolve) => setTimeout(resolve, 1000));

    const isConnected = providers[provider];
    setProviders((prev) => ({ ...prev, [provider]: !isConnected }));

    toast.success(
      isConnected
        ? t("oauth_unlinked_toast", {
            provider: provider === "google" ? "Google" : "GitHub",
          })
        : t("oauth_linked_toast", {
            provider: provider === "google" ? "Google" : "GitHub",
          }),
    );
    setLoading(null);
  };

  const providersConfig = [
    { id: "google", name: "Google", icon: <GoogleIcon /> },
    {
      id: "github",
      name: "Github",
      icon: <Github className="h-4 w-4" />,
    },
  ] as const;

  return (
    <Card className="border border-muted/50 shadow-[0_8px_30px_rgb(0,0,0,0.04)] bg-background/60 backdrop-blur-md rounded-xl overflow-hidden transition-all duration-300">
      <CardHeader className="space-y-1.5 pb-5">
        <CardTitle className="text-md font-semibold text-foreground/90 flex items-center gap-2">
          <div className="p-1.5 bg-secondary/50 rounded-md border border-muted/40">
            <Link2 className="h-3.5 w-3.5 text-muted-foreground/80" />
          </div>
          {t("oauth_title")}
        </CardTitle>
        <CardDescription className="text-sm text-muted-foreground/80">
          {t("oauth_description")}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-3 pb-6">
        {providersConfig.map((p) => (
          <div
            key={p.id}
            className="flex items-center justify-between p-3 rounded-lg border border-muted/60 bg-secondary/10 hover:bg-secondary/20 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-md bg-white border border-muted/40 flex items-center justify-center">
                {p.icon}
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-medium">{p.name}</span>
                <span className="text-[11px] text-muted-foreground">
                  {providers[p.id]
                    ? t("oauth_active_status")
                    : t("oauth_not_connected_status")}
                </span>
              </div>
            </div>

            <Button
              variant={providers[p.id] ? "outline" : "default"}
              size="sm"
              className="h-8 text-[11px] font-medium bg-secondary text-foreground hover:bg-primary hover:text-white"
              disabled={loading === p.id}
              onClick={() => handleToggle(p.id)}
            >
              {loading === p.id ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : providers[p.id] ? (
                t("oauth_unlink_button")
              ) : (
                t("oauth_connect_button")
              )}
            </Button>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
