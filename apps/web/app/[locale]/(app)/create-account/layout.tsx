import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale });

  return { title: `${t("createAccount")} | TaskFlow` };
}

export default function CreateAccountLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
