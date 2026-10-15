import en from './en.json';
import es from './es.json';
import ru from './ru.json';

export const languages = ['en', 'es', 'ru'] as const;
export type Lang = (typeof languages)[number];
export type Dict = typeof en;

export const defaultLang: Lang = 'en';

const dicts: Record<Lang, Dict> = { en, es, ru };

// BCP 47 tags for <html lang>, hreflang and og:locale.
export const htmlLang: Record<Lang, string> = { en: 'en-US', es: 'es-MX', ru: 'ru' };
export const ogLocale: Record<Lang, string> = { en: 'en_US', es: 'es_MX', ru: 'ru_RU' };

export const t = (lang: Lang): Dict => dicts[lang];

export const getLang = (currentLocale: string | undefined): Lang =>
  (languages as readonly string[]).includes(currentLocale ?? '') ? (currentLocale as Lang) : defaultLang;

/** Path of the same page in another language. `page` is '' for home or e.g. 'privacy'. */
export const localePath = (lang: Lang, page = ''): string => {
  const prefix = lang === defaultLang ? '' : `/${lang}`;
  return page ? `${prefix}/${page}` : `${prefix}/`;
};
