/**
 * Supported currencies for the Financial App demo.
 *
 * The demo profile is deliberately single-currency (EUR) so that aggregate
 * figures such as "total balance" stay financially meaningful. GBP exists in
 * the type so the currency-match invariant is a real, testable rule rather
 * than dead code.
 */
export type CurrencyCode = 'EUR' | 'GBP';

/** Number of decimal digits in the minor unit of each supported currency. */
export const CURRENCY_PRECISION: Readonly<Record<CurrencyCode, number>> = {
  EUR: 2,
  GBP: 2,
};

export const CURRENCY_SYMBOL: Readonly<Record<CurrencyCode, string>> = {
  EUR: '€',
  GBP: '£',
};

/** Decimal base: a currency with precision `p` has `10 ** p` minor units. */
const DECIMAL_BASE = 10;

export const precisionOf = (currency: CurrencyCode): number => CURRENCY_PRECISION[currency];

/** How many minor units make up one major unit of the currency. */
export const minorUnitScale = (currency: CurrencyCode): number =>
  DECIMAL_BASE ** precisionOf(currency);

export const isCurrencyCode = (value: string): value is CurrencyCode =>
  Object.prototype.hasOwnProperty.call(CURRENCY_PRECISION, value);
