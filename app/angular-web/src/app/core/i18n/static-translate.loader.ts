import { Observable, of } from 'rxjs';
import { TranslateLoader } from '@ngx-translate/core';
import { AppLanguage, DEFAULT_LANGUAGE, isAppLanguage } from './language';
import { EN_TRANSLATIONS, Translated, TranslationDictionary } from './translations/en';
import { UA_TRANSLATIONS } from './translations/ua';

const DICTIONARIES: Readonly<Record<AppLanguage, Translated<TranslationDictionary>>> = {
  en: EN_TRANSLATIONS,
  ua: UA_TRANSLATIONS,
};

/**
 * The dictionaries are plain TypeScript modules rather than JSON assets: they
 * ship with the bundle, are type-checked against the English contract and need
 * no HTTP round trip, so switching language is synchronous.
 */
export class StaticTranslateLoader extends TranslateLoader {
  getTranslation(lang: string): Observable<Translated<TranslationDictionary>> {
    return of(DICTIONARIES[isAppLanguage(lang) ? lang : DEFAULT_LANGUAGE]);
  }
}
