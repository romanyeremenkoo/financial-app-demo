import { AppLanguage, DEFAULT_LANGUAGE, isAppLanguage } from './language';

const STORAGE_KEY = 'financial-app.language';

/**
 * Local-storage access for the language choice.
 *
 * Storage can throw (private mode, disabled cookies), so both helpers degrade
 * to the default language and let the in-memory signal stay authoritative.
 */
export const readStoredLanguage = (): AppLanguage => {
  try {
    const stored = globalThis.localStorage.getItem(STORAGE_KEY);
    return stored !== null && isAppLanguage(stored) ? stored : DEFAULT_LANGUAGE;
  } catch {
    return DEFAULT_LANGUAGE;
  }
};

export const writeStoredLanguage = (language: AppLanguage): void => {
  try {
    globalThis.localStorage.setItem(STORAGE_KEY, language);
  } catch {
    // Intentionally ignored: the in-memory signal still drives the UI.
  }
};
