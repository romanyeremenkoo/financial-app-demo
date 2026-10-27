export const APP_LANGUAGES = ['en', 'ua'] as const;

export type AppLanguage = (typeof APP_LANGUAGES)[number];

export const DEFAULT_LANGUAGE: AppLanguage = 'en';

/** BCP-47 tags handed to `Intl` for money and date formatting. */
export const LANGUAGE_LOCALE: Readonly<Record<AppLanguage, string>> = {
  en: 'en-IE',
  ua: 'uk-UA',
};

/**
 * BCP-47 tags written to the document `lang` attribute.
 *
 * Browsers, screen readers and `Intl` only understand the
 * registered one, so the two are mapped deliberately rather than reused.
 */
export const LANGUAGE_HTML_TAG: Readonly<Record<AppLanguage, string>> = {
  en: 'en',
  ua: 'uk',
};

export const LANGUAGE_SHORT_LABEL: Readonly<Record<AppLanguage, string>> = {
  en: 'EN',
  ua: 'UA',
};

export const isAppLanguage = (value: string): value is AppLanguage =>
  (APP_LANGUAGES as readonly string[]).includes(value);
