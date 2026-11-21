import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import "../../shared/styles/globals.css";

import { Providers } from "@/providers/providers";
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

  // GoogleCaptchaProvider вызывает useLocale(), поэтому должен быть внутри NextIntlClientProvider
  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      <GoogleCaptchaProvider
        siteKey={process.env.NEXT_PUBLIC_GOOGLE_CAPTCHA_PUBLIC_KEY!}
      >
        <Providers>
          {children}
          <Toaster richColors closeButton />
        </Providers>
      </GoogleCaptchaProvider>
    </NextIntlClientProvider>
  );
}
