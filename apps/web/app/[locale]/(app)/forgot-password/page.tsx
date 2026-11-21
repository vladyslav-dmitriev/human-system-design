import { redirect } from "@/i18n/navigation";
import { ROUTE } from "@/constants";

// Сброс пароля не реализован: страница скрыта и ведёт на вход в той же локали
export default async function ForgotPasswordPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  redirect({ href: ROUTE.LOGIN, locale });
}
