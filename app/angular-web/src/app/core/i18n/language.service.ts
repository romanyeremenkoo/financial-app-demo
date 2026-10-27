import { DOCUMENT, Injectable, computed, inject, signal } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { AppLanguage, LANGUAGE_HTML_TAG, LANGUAGE_LOCALE } from './language';
import { readStoredLanguage, writeStoredLanguage } from './language.storage';

/**
 * Owns the active language. The signal is authoritative for the UI; ngx-translate
 * and `localStorage` are kept in sync as side effects of `use()`.
 */
@Injectable({ providedIn: 'root' })
export class LanguageService {
  private readonly translate = inject(TranslateService);
  private readonly document = inject(DOCUMENT);
  private readonly active = signal<AppLanguage>(readStoredLanguage());

  readonly language = this.active.asReadonly();

  /** BCP-47 tag for every `Intl` formatter in the application. */
  readonly locale = computed(() => LANGUAGE_LOCALE[this.active()]);

  constructor() {
    this.apply(this.active());
  }

  use(language: AppLanguage): void {
    if (language === this.active()) {
      return;
    }
    this.active.set(language);
    writeStoredLanguage(language);
    this.apply(language);
  }

  private apply(language: AppLanguage): void {
    this.translate.use(language);
    this.document.documentElement.lang = LANGUAGE_HTML_TAG[language];
  }
}
