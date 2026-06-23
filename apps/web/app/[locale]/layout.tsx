import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import "../../shared/styles/globals.css";

import { Providers } from "@/providers/providers";
import { SidebarWrapper } from "@/widgets/sidebar/sidebar-wrapper";
import { Toaster } from "@/components/ui/sonner";
import { GoogleCaptchaProvider } from "@/providers/google-captcha-provider";
export default async function RootLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}>) {
  const { locale } = await params;
  const messages = await getMessages();

  return (
    <GoogleCaptchaProvider
      siteKey={process.env.NEXT_PUBLIC_GOOGLE_CAPTCHA_PUBLIC_KEY}
    >
      <NextIntlClientProvider locale={locale} messages={messages}>
        <Providers>
          <SidebarWrapper>{children}</SidebarWrapper>
          <Toaster richColors closeButton /> {/* 👈 Добавляем сюда */}
        </Providers>
      </NextIntlClientProvider>
    </GoogleCaptchaProvider>
  );
}
