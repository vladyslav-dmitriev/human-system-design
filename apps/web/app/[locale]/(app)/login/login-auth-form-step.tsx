import { useId } from "react";
import { Loader2, ArrowRight } from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Link } from "@/i18n/navigation";
import { ROUTE } from "@/constants";
import { AuthFormError } from "@/widgets/auth/auth-form-error";
import { AuthFormInput } from "@/widgets/auth/auth-form-input";

type LoginAuthFormStepProps = {
  isLoading: boolean;
  error: string | null;
  fieldErrors?: Record<string, string>;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
};

export const LoginAuthFormStep = ({
  isLoading,
  error,
  fieldErrors = {},
  onSubmit,
}: LoginAuthFormStepProps) => {
  const t = useTranslations();
  const errorId = useId();

  return (
    <main
      id="main"
      className="flex min-h-screen items-center justify-center p-6 bg-neutral-50/50"
    >
      <Card className="w-full max-w-sm border border-muted/50 shadow-[0_8px_30px_rgb(0,0,0,0.04)] bg-background/60 backdrop-blur-md rounded-2xl overflow-hidden">
        <CardHeader className="space-y-1 pb-4 text-center">
          <CardTitle className="text-2xl font-semibold tracking-tight">
            <h1>{t("login")}</h1>
          </CardTitle>
          <CardDescription className="text-sm text-muted-foreground">
            {t("welcome_back")}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <form onSubmit={onSubmit} noValidate className="space-y-4">
            <div className="space-y-3">
              <AuthFormInput
                testId="email-input"
                name="email"
                type="email"
                label={t("email_label")}
                autoComplete="email"
                error={fieldErrors.email}
                formErrorId={error ? errorId : undefined}
              />
              <AuthFormInput
                testId="password-input"
                name="password"
                type="password"
                label={t("password")}
                autoComplete="current-password"
                error={fieldErrors.password}
                formErrorId={error ? errorId : undefined}
              />
            </div>

            <AuthFormError id={errorId} error={error} />

            <Button
              data-testid="login-button"
              type="submit"
              className="w-full rounded-lg h-10 font-medium"
              disabled={isLoading}
              aria-busy={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                  <span className="sr-only">{t("loading")}</span>
                </>
              ) : (
                <>
                  {t("login")}{" "}
                  <ArrowRight className="ml-2 h-3.5 w-3.5" aria-hidden />
                </>
              )}
            </Button>
          </form>

          <div className="pt-2 text-center text-xs text-muted-foreground">
            {t("notHaveAccount")}{" "}
            <Link
              href={ROUTE.CREATE_ACCOUNT}
              className="font-semibold text-foreground hover:underline"
            >
              {t("createAccount")}
            </Link>
          </div>
        </CardContent>
      </Card>
    </main>
  );
};
