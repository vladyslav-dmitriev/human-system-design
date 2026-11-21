export const formatStripePrice = (cents: number): string => {
  return (cents / 100).toFixed(2);
};

/** Соответствие локали сайта BCP-47 тегу для Intl */
const INTL_LOCALE: Record<string, string> = { en: "en-US", uk: "uk-UA" };

export const toIntlLocale = (locale?: string): string =>
  (locale && INTL_LOCALE[locale]) || "en-US";

/** Сумма из центов в валюте с учётом локали сайта (`en` / `uk`) */
export const getFormattedPrice = (
  amount: number | null | undefined,
  currency: string | null | undefined,
  locale?: string,
): string => {
  return new Intl.NumberFormat(toIntlLocale(locale), {
    style: "currency",
    currency: currency || "usd",
  }).format((amount ?? 0) / 100);
};

/** Дата по локали сайта */
export const formatDate = (
  value: Date | number | string,
  locale?: string,
  options: Intl.DateTimeFormatOptions = { dateStyle: "medium" },
): string =>
  new Intl.DateTimeFormat(toIntlLocale(locale), options).format(
    new Date(value),
  );
