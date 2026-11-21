"use client";

import { useId, useState } from "react";
import { signIn } from "next-auth/react";
import { useTranslations, useLocale } from "next-intl";
import { Loader2, ArrowRight } from "lucide-react";

import { useRouter, Link } from "@/i18n/navigation";
import { ROUTE } from "@/constants";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { API_URL } from "@/api";
import { getApiErrorCode } from "@/shared/lib/api-error";
import {
  createAccountSchema,
  getFieldErrors,
} from "@/shared/lib/auth-schemas";
import {
  AuthFlowError,
  fromApiCode,
  getAuthErrorKey,
} from "@/widgets/auth/auth-errors";
import { getCaptchaToken } from "@/widgets/auth/get-captcha-token";
import { AuthFormError } from "@/widgets/auth/auth-form-error";
import { AuthFormInput } from "@/widgets/auth/auth-form-input";

export default function CreateAccountPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations();
  const errorId = useId();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    const formData = new FormData(e.currentTarget);
    const parsed = createAccountSchema.safeParse({
      name: formData.get("name") ?? "",
      email: formData.get("email") ?? "",
      password: formData.get("password") ?? "",
    });

    if (!parsed.success) {
      const errors = getFieldErrors(parsed.error);
      setFieldErrors(
        Object.fromEntries(Object.entries(errors).map(([k, v]) => [k, t(v)])),
      );
      return;
    }

    setFieldErrors({});
    setIsLoading(true);

    const { name, email, password } = parsed.data;

    try {
      const captchaToken = await getCaptchaToken("register");

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

      if (!response.ok) {
        throw fromApiCode(await getApiErrorCode(response));
      }

      // После регистрации входим обычным путём: login → loginTicket → signIn
      const loginResponse = await fetch(API_URL.auth.login(), {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password,
          captchaToken: await getCaptchaToken("login"),
        }),
      });

      if (!loginResponse.ok) {
        throw fromApiCode(await getApiErrorCode(loginResponse));
      }

      const login = await loginResponse.json();

      // У нового пользователя 2FA нет; если вдруг включена, идём на страницу входа
      if (login.twoFactorRequired || !login.loginTicket) {
        router.replace(ROUTE.LOGIN);
        return;
      }

      const loginResult = await signIn("credentials", {
        loginTicket: login.loginTicket,
        redirect: false,
      });

      if (!loginResult || loginResult.error) {
        throw new AuthFlowError("errors.AUTH_TICKET_INVALID");
      }

      router.replace(ROUTE.DASHBOARD);
      router.refresh();
    } catch (cause) {
      console.error(cause);
      setError(t(getAuthErrorKey(cause)));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main
      id="main"
      className="flex min-h-screen items-center justify-center p-6 bg-neutral-50/50"
    >
      <Card className="w-full max-w-sm border border-muted/50 shadow-[0_8px_30px_rgb(0,0,0,0.04)] bg-background/60 backdrop-blur-md rounded-2xl overflow-hidden">
        <CardHeader className="space-y-1 pb-4 text-center">
          <CardTitle className="text-2xl font-semibold tracking-tight">
            <h1>{t("createAccount")}</h1>
          </CardTitle>
          <CardDescription className="text-sm text-muted-foreground">
            {t("welcome_description")}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            <div className="space-y-3">
              <AuthFormInput
                testId="name-input"
                name="name"
                type="text"
                label={t("name")}
                autoComplete="name"
                error={fieldErrors.name}
              />
              <AuthFormInput
                testId="email-input"
                name="email"
                type="email"
                label={t("email_label")}
                autoComplete="email"
                error={fieldErrors.email}
              />
              <AuthFormInput
                testId="password-input"
                name="password"
                type="password"
                label={t("password")}
                autoComplete="new-password"
                error={fieldErrors.password}
              />
            </div>

            <AuthFormError id={errorId} error={error} />

            <Button
              data-testid="create-account-button"
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
                  {t("createAccount")}
                  <ArrowRight className="ml-2 h-3.5 w-3.5" aria-hidden />
                </>
              )}
            </Button>
          </form>

          <div className="pt-2 text-center text-xs text-muted-foreground">
            {t("alreadyHaveAccount")}{" "}
            <Link
              href={ROUTE.LOGIN}
              className="font-semibold text-foreground hover:underline"
            >
              {t("login")}
            </Link>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
