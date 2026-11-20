import en from './translates/en.json';
import uk from './translates/uk.json';

type TranslationTree = { [key: string]: string | TranslationTree };

// resolveJsonModule + esModuleInterop: json приходит как объект или как { default }
const unwrap = (json: unknown): TranslationTree =>
  ((json as { default?: TranslationTree }).default ?? json) as TranslationTree;

const translations: Record<'en' | 'uk', TranslationTree> = {
  en: unwrap(en),
  uk: unwrap(uk),
};

export const t = (
  key: string,
  locale: 'en' | 'uk',
  params?: Record<string, string | number>,
): string => {
  const data = translations[locale];

  // 1. Поиск значения по ключу (например, "invoice.title")
  const value = key
    .split('.')
    .reduce<string | TranslationTree | undefined>((o, k) => {
      return o && typeof o === 'object' ? o[k] : undefined;
    }, data);

  // 2. Если ключа нет, возвращаем ключ, чтобы сразу видеть ошибку в письме
  if (typeof value !== 'string') {
    console.error(`[i18n] Key "${key}" not found for locale "${locale}"`);
    return key;
  }

  // 3. Замена параметров
  if (params) {
    return Object.keys(params).reduce((str, k) => {
      // Ищем {{k}} и меняем на значение
      const regex = new RegExp(`{{${k}}}`, 'g');
      return str.replace(regex, String(params[k]));
    }, value);
  }

  return value;
};
