import { getRequestConfig } from "next-intl/server";
import { getMessages, locales } from "@repo/i18n";

export default getRequestConfig(async ({ requestLocale }) => {
  const locale = await requestLocale;
  const safeLocale = locales.includes(locale as any) ? locale : "en";

  return {
    locale: safeLocale,
    messages: await getMessages(safeLocale),
  };
});
