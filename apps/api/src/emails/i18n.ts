import en from './translates/en.json';
import uk from './translates/uk.json';

const translations = {
  en: (en as any).default || en,
  uk: (uk as any).default || uk,
};

export const t = (
  key: string,
  locale: 'en' | 'uk',
  params?: Record<string, string | number>,
): string => {
  const data = translations[locale];

  // 1. Поиск значения по ключу (например, "invoice.title")
  const value = key.split('.').reduce((o: any, k: string) => {
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
