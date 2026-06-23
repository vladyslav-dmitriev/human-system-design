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
import { useTranslations } from "next-intl";
import { ROUTE } from "@/constants";

type LoginAuthFormStepProps = {
  isLoading: boolean;
  error: string | null;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  onSignInGoogle: () => void;
  onSignInGithub: () => void;
};

export const LoginAuthFormStep = ({
  isLoading,
  error,
  onSubmit,
  onSignInGoogle,
  onSignInGithub,
}: LoginAuthFormStepProps) => {
  const t = useTranslations();

  return (
    <div className="flex min-h-screen items-center justify-center p-6 bg-neutral-50/50">
      <Card className="w-full max-w-sm border border-muted/50 shadow-[0_8px_30px_rgb(0,0,0,0.04)] bg-background/60 backdrop-blur-md rounded-2xl overflow-hidden">
        <CardHeader className="space-y-1 pb-4 text-center">
          <CardTitle className="text-2xl font-semibold tracking-tight">
            {t("login")}
          </CardTitle>
          <CardDescription className="text-sm text-muted-foreground">
            {t.has("welcome_back")
              ? t("welcome_back")
              : "Welcome back to your account"}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <Input
                name="email"
                type="email"
                placeholder="Email"
                required
                className="h-10 rounded-lg bg-secondary/20"
              />
              <Input
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
              type="submit"
              className="w-full rounded-lg h-10 font-medium"
              disabled={isLoading}
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  {t("login")} <ArrowRight className="ml-2 h-3.5 w-3.5" />
                </>
              )}
            </Button>
          </form>

          {/* Разделитель и OAuth кнопки теперь внизу */}
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
              onClick={onSignInGoogle}
            >
              <span className="text-base">G</span> Google
            </Button>
            <Button
              variant="outline"
              className="w-full gap-2 rounded-lg"
              onClick={onSignInGithub}
            >
              <Github className="h-4 w-4" /> GitHub
            </Button>
          </div>

          <div className="pt-2 text-center text-xs text-muted-foreground space-y-2">
            <a href={ROUTE.FORGOT_PASSWORD} className="hover:underline">
              {t("forgot_password")}
            </a>
            <div>
              {t("notHaveAccount")}{" "}
              <a
                href={ROUTE.CREATE_ACCOUNT}
                className="font-semibold text-foreground hover:underline"
              >
                {t("createAccount")}
              </a>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
