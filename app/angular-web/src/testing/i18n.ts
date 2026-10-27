import { Provider } from '@angular/core';
import { provideTranslateService } from '@ngx-translate/core';
import { DEFAULT_LANGUAGE } from '../app/core/i18n/language';
import { StaticTranslateLoader } from '../app/core/i18n/static-translate.loader';

/**
 * Real translations in tests: the loader is synchronous and bundled, so specs
 * exercise the same key resolution the application uses.
 */
export const provideTestTranslations = (): Provider[] => [
  provideTranslateService({
    lang: DEFAULT_LANGUAGE,
    fallbackLang: DEFAULT_LANGUAGE,
    loader: StaticTranslateLoader,
  }),
];
