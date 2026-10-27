import { SpectatorService, createServiceFactory } from '@ngneat/spectator/vitest';
import { beforeEach, describe, expect, it } from 'vitest';
import { TranslateService } from '@ngx-translate/core';
import { provideTestTranslations } from '../../../testing/i18n';
import { LanguageService } from './language.service';
import { APP_LANGUAGES, LANGUAGE_LOCALE } from './language';
import { EN_TRANSLATIONS } from './translations/en';
import { UA_TRANSLATIONS } from './translations/ua';

const collectKeys = (value: unknown, prefix = ''): string[] =>
  typeof value !== 'object' || value === null
    ? [prefix]
    : Object.entries(value).flatMap(([key, child]) =>
        collectKeys(child, prefix === '' ? key : `${prefix}.${key}`),
      );

describe('translation dictionaries', () => {
  it('declares exactly the same keys in every language', () => {
    expect(collectKeys(UA_TRANSLATIONS).sort()).toEqual(collectKeys(EN_TRANSLATIONS).sort());
  });

  it('never leaves a translated value empty', () => {
    const empty = collectKeys(UA_TRANSLATIONS).filter(
      (key) =>
        key
          .split('.')
          .reduce<unknown>(
            (node, part) => (node as Record<string, unknown>)[part],
            UA_TRANSLATIONS,
          ) === '',
    );

    expect(empty).toEqual([]);
  });

  it('keeps interpolation placeholders consistent across languages', () => {
    const placeholders = (dictionary: unknown, key: string): string[] => {
      const value = key
        .split('.')
        .reduce<unknown>((node, part) => (node as Record<string, unknown>)[part], dictionary);
      return [...String(value).matchAll(/{{\s*(\w+)\s*}}/g)].map((match) => match[1]).sort();
    };

    for (const key of collectKeys(EN_TRANSLATIONS)) {
      expect(placeholders(UA_TRANSLATIONS, key)).toEqual(placeholders(EN_TRANSLATIONS, key));
    }
  });
});

describe('LanguageService', () => {
  let spectator: SpectatorService<LanguageService>;

  const createService = createServiceFactory({
    service: LanguageService,
    providers: [provideTestTranslations()],
  });

  beforeEach(() => {
    globalThis.localStorage.clear();
    spectator = createService();
  });

  it('starts in English and exposes the matching Intl locale', () => {
    expect(spectator.service.language()).toBe('en');
    expect(spectator.service.locale()).toBe(LANGUAGE_LOCALE.en);
  });

  it('switches the active language, the locale and the document language', () => {
    spectator.service.use('ua');

    expect(spectator.service.language()).toBe('ua');
    expect(spectator.service.locale()).toBe(LANGUAGE_LOCALE.ua);
    expect(document.documentElement.lang).toBe('uk');
  });

  it('persists the choice so a later session starts in the same language', () => {
    spectator.service.use('ua');

    expect(globalThis.localStorage.getItem('financial-app.language')).toBe('ua');
  });

  it('resolves keys through the active dictionary', () => {
    const translate = spectator.inject(TranslateService);

    expect(translate.instant('nav.transfers')).toBe(EN_TRANSLATIONS.nav.transfers);

    spectator.service.use('ua');
    expect(translate.instant('nav.transfers')).toBe(UA_TRANSLATIONS.nav.transfers);
  });

  it('ignores a repeated switch to the language already in use', () => {
    const translate = spectator.inject(TranslateService);
    spectator.service.use('ua');
    spectator.service.use('ua');

    expect(translate.getCurrentLang()).toBe('ua');
    expect(APP_LANGUAGES).toContain(spectator.service.language());
  });
});
