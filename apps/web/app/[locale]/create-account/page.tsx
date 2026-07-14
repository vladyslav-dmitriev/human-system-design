"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { ROUTE } from "@/constants";
import { useTranslations, useLocale } from "next-intl";
import { Loader2, ArrowRight, Github } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { API_URL } from "@/api";
import { executeRecaptcha } from "@/providers/google-captcha-provider";

export default function CreateAccountPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const name = formData.get("name") as string;
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    try {
      const captchaToken = await executeRecaptcha("register");

      const response = await fetch(API_URL.auth.createAccount(), {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          email,
          password,
          locale,
          captchaToken,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Не удалось обновить email");
      }

      if (result?.error) {
        setError(
          typeof result.error === "string"
            ? result.error
            : t("validation_error"),
        );
        setIsLoading(false);
      } else if (result?.success) {
        const loginResult = await signIn("credentials", {
          email,
          password,
          redirect: false,
        });

        if (loginResult?.error) {
          setError(t("invalid_credentials"));
          setIsLoading(false);
        } else {
          router.push(ROUTE.DASHBOARD);
          router.refresh();
        }
      }
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-6 bg-neutral-50/50">
      <Card className="w-full max-w-sm border border-muted/50 shadow-[0_8px_30px_rgb(0,0,0,0.04)] bg-background/60 backdrop-blur-md rounded-2xl overflow-hidden">
        <CardHeader className="space-y-1 pb-4 text-center">
          <CardTitle className="text-2xl font-semibold tracking-tight">
            {t("createAccount")}
          </CardTitle>
          <CardDescription className="text-sm text-muted-foreground">
            {t.has("welcome_description")
              ? t("welcome_description")
              : "Get started with your account"}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Input
                data-testid="name-input"
                name="name"
                type="text"
                placeholder={t("name")}
                required
                className="h-10 rounded-lg bg-secondary/20"
              />
              <Input
                data-testid="email-input"
                name="email"
                type="email"
                placeholder="Email"
                required
                className="h-10 rounded-lg bg-secondary/20"
              />
              <Input
                data-testid="password-input"
                name="password"
                type="password"
                placeholder={t("password")}
                required
                className="h-10 rounded-lg bg-secondary/20"
              />
            </div>

            {error && (
              <p className="text-[11px] text-destructive font-medium">
                {error}
              </p>
            )}

            <Button
              data-testid="create-account-button"
              type="submit"
              className="w-full rounded-lg h-10 font-medium"
              disabled={isLoading}
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  {t("createAccount")}
                  <ArrowRight className="ml-2 h-3.5 w-3.5" />
                </>
              )}
            </Button>
          </form>

          <div className="relative flex items-center gap-3 py-2">
            <Separator className="flex-1" />
            <span className="text-[11px] uppercase tracking-wider text-muted-foreground">
              or
            </span>
            <Separator className="flex-1" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Button
              variant="outline"
              className="w-full gap-2 rounded-lg"
              onClick={() => signIn("google")}
            >
              <span className="text-base">G</span> Google
            </Button>
            <Button
              variant="outline"
              className="w-full gap-2 rounded-lg"
              onClick={() => signIn("github")}
            >
              <Github className="h-4 w-4" /> GitHub
            </Button>
          </div>

          <div className="pt-2 text-center text-xs text-muted-foreground">
            {t("alreadyHaveAccount")}{" "}
            <a
              href={ROUTE.LOGIN}
              className="font-semibold text-foreground hover:underline"
            >
              {t("login")}
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
