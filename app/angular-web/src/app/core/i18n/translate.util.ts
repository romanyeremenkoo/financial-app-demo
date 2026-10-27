import { Signal, computed } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';

type InterpolationParams = Readonly<Record<string, string | number>>;

/**
 * `TranslateService.translate` is typed loosely because a key may resolve to a
 * nested object. Every key used through these helpers resolves to a string, so
 * the result is narrowed once here instead of at each call site.
 */
export const translateSignal = (
  translate: TranslateService,
  key: () => string,
  params?: () => InterpolationParams,
): Signal<string> => {
  const translated = translate.translate(key, params);
  return computed(() => String(translated()));
};

export const translateNow = (
  translate: TranslateService,
  key: string,
  params?: InterpolationParams,
): string => String(translate.instant(key, params));
