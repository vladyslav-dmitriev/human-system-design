import { NextIntlClientProvider } from "next-intl";

import { getMessages } from "next-intl/server";

type IntlProviderProps = {
  children: React.ReactNode;
};

export default async function IntlProvider({ children }: IntlProviderProps) {
  const messages = await getMessages();

  return (
    <NextIntlClientProvider messages={messages}>
      {children}
    </NextIntlClientProvider>
  );
}
