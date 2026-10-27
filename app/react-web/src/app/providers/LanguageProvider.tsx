import { type ReactNode, useCallback, useEffect, useMemo, useState } from 'react';
import { I18nextProvider } from 'react-i18next';
import type { i18n as I18n } from 'i18next';
import { i18nInstance } from '../../i18n/i18n';
import {
  type AppLanguage,
  LANGUAGE_HTML_TAG,
  LANGUAGE_LOCALE,
  readStoredLanguage,
  writeStoredLanguage,
} from '../../i18n/language';
import { LanguageContext } from './language-context';

export interface LanguageProviderProps {
  readonly children: ReactNode;
  readonly instance?: I18n;
}

/**
 * Owns the active language.
 *
 * The React state is authoritative for the UI; i18next, `localStorage` and the
 * document `lang` attribute are kept in sync as side effects.
 */
export const LanguageProvider = ({ children, instance = i18nInstance }: LanguageProviderProps) => {
  const [language, setLanguage] = useState<AppLanguage>(() => readStoredLanguage());

  useEffect(() => {
    void instance.changeLanguage(language);
    document.documentElement.lang = LANGUAGE_HTML_TAG[language];
  }, [instance, language]);

  const use = useCallback((next: AppLanguage) => {
    setLanguage(next);
    writeStoredLanguage(next);
  }, []);

  const value = useMemo(
    () => ({ language, locale: LANGUAGE_LOCALE[language], use }),
    [language, use],
  );

  return (
    <I18nextProvider i18n={instance}>
      <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
    </I18nextProvider>
  );
};
