import { CheckCircle2, XCircle } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { API_URL } from "@/api";
import { auth } from "@/auth";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import { ROUTE } from "@/constants";
import { Link } from "@/i18n/navigation";
import { getApiErrorCode } from "@/shared/lib/api-error";

type VerifyEmailPageProps = {
  searchParams: Promise<{ token?: string | string[] }>;
};

type Result = "success" | "invalid" | "error";

async function verifyEmail(token: string | undefined): Promise<Result> {
  if (!token) return "invalid";

  try {
    const res = await fetch(API_URL.emails.verifyEmailServer(token), {
      cache: "no-store",
    });

    if (res.ok) return "success";

    return (await getApiErrorCode(res)) === "EMAIL_TOKEN_INVALID"
      ? "invalid"
      : "error";
  } catch (error) {
    console.error("Ошибка подтверждения почты:", error);
    return "error";
  }
}

/** Публичная страница: письмо открывают и с сессией, и без неё */
export default async function VerifyEmailPage({
  searchParams,
}: VerifyEmailPageProps) {
  const { token } = await searchParams;
  const [result, session, t] = await Promise.all([
    verifyEmail(Array.isArray(token) ? token[0] : token),
    auth(),
    getTranslations(),
  ]);
  const isSuccess = result === "success";

  return (
    <main className="flex min-h-screen items-center justify-center p-6 bg-muted/30">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <div
            className={
              isSuccess
                ? "mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                : "mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 text-destructive"
            }
          >
            {isSuccess ? (
              <CheckCircle2 className="h-6 w-6" aria-hidden="true" />
            ) : (
              <XCircle className="h-6 w-6" aria-hidden="true" />
            )}
          </div>
          <h1 className="text-xl font-semibold leading-none tracking-tight">
            {t("verify_email_title")}
          </h1>
        </CardHeader>
        <CardContent>
          <p
            role={isSuccess ? "status" : "alert"}
            className="text-sm text-muted-foreground"
          >
            {t(`verify_email_${result}`)}
          </p>
        </CardContent>
        <CardFooter className="justify-center">
          {/* "!" перебивает глобальное `a { color: inherit }` */}
          <Button asChild className="text-primary-foreground!">
            <Link href={session ? ROUTE.DASHBOARD : ROUTE.LOGIN}>
              {session
                ? t("verify_email_to_dashboard")
                : t("verify_email_to_login")}
            </Link>
          </Button>
        </CardFooter>
      </Card>
    </main>
  );
}
