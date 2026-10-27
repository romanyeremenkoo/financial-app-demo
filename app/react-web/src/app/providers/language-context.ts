import { createContext, useContext } from 'react';
import type { AppLanguage } from '../../i18n/language';

export interface LanguageContextValue {
  readonly language: AppLanguage;
  /** BCP-47 tag for every `Intl` formatter in the application. */
  readonly locale: string;
  use: (language: AppLanguage) => void;
}

export const LanguageContext = createContext<LanguageContextValue | null>(null);

export const useLanguage = (): LanguageContextValue => {
  const context = useContext(LanguageContext);
  if (context === null) {
    throw new Error('useLanguage must be used inside <LanguageProvider>.');
  }
  return context;
};
