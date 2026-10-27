type DateStyle = 'dayMonth' | 'fullDate' | 'time' | 'monthYear' | 'monthShort';

const OPTIONS: Readonly<Record<DateStyle, Intl.DateTimeFormatOptions>> = {
  dayMonth: { day: '2-digit', month: 'short' },
  fullDate: { weekday: 'short', day: '2-digit', month: 'long', year: 'numeric' },
  time: { hour: '2-digit', minute: '2-digit' },
  monthYear: { month: 'long', year: 'numeric' },
  monthShort: { month: 'short', timeZone: 'UTC' },
};

/** `Intl` formatters are expensive to build, so one instance per locale/style is reused. */
const CACHE = new Map<string, Intl.DateTimeFormat>();

const formatter = (style: DateStyle, locale: string): Intl.DateTimeFormat => {
  const cacheKey = `${locale}|${style}`;
  const cached = CACHE.get(cacheKey);
  if (cached !== undefined) {
    return cached;
  }
  const created = new Intl.DateTimeFormat(locale, OPTIONS[style]);
  CACHE.set(cacheKey, created);
  return created;
};

export const formatShortDate = (iso: string, locale: string): string =>
  formatter('dayMonth', locale).format(new Date(iso));

export const formatFullDate = (iso: string, locale: string): string =>
  formatter('fullDate', locale).format(new Date(iso));

export const formatTime = (iso: string, locale: string): string =>
  formatter('time', locale).format(new Date(iso));

export const formatMonthYear = (date: Date, locale: string): string =>
  formatter('monthYear', locale).format(date);

/** Formats a `YYYY-MM` month key as a short month name. */
export const formatMonthKey = (monthKey: string, locale: string): string =>
  formatter('monthShort', locale).format(new Date(`${monthKey}-01T00:00:00.000Z`));

const MS_PER_DAY = 86_400_000;

export const TODAY_OFFSET = 0;
export const YESTERDAY_OFFSET = 1;

/** Whole days between the start of `now` and the start of the given instant, in UTC. */
export const dayOffset = (iso: string, now: Date = new Date()): number => {
  const value = new Date(iso);
  const startOfToday = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const startOfValue = Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate());
  return Math.round((startOfToday - startOfValue) / MS_PER_DAY);
};
