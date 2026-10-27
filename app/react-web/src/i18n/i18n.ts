import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { EN_TRANSLATIONS } from './en';
import { UA_TRANSLATIONS } from './ua';
import { DEFAULT_LANGUAGE, readStoredLanguage } from './language';

/** Single namespace: the dictionaries are small and ship with the bundle. */
export const I18N_NAMESPACE = 'translation';

export const createI18n = (language = readStoredLanguage()): typeof i18n => {
  const instance = i18n.createInstance();

  void instance.use(initReactI18next).init({
    lng: language,
    fallbackLng: DEFAULT_LANGUAGE,
    defaultNS: I18N_NAMESPACE,
    resources: {
      en: { [I18N_NAMESPACE]: EN_TRANSLATIONS },
      ua: { [I18N_NAMESPACE]: UA_TRANSLATIONS },
    },
    interpolation: {
      // React already escapes rendered values.
      escapeValue: false,
    },
    returnNull: false,
  });

  return instance;
};

export const i18nInstance = createI18n();
