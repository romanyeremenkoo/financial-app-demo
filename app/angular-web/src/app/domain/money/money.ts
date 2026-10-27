import { CURRENCY_SYMBOL, CurrencyCode, minorUnitScale, precisionOf } from './currency';

/**
 * Authoritative monetary value.
 *
 * `amountMinor` is always an integer expressed in the currency's minor unit
 * (cents for EUR/GBP). Floating point numbers are never the source of truth
 * for financial state; they only appear at the formatting boundary.
 */
export interface Money {
  readonly amountMinor: number;
  readonly currency: CurrencyCode;
}

export class CurrencyMismatchError extends Error {
  constructor(left: CurrencyCode, right: CurrencyCode) {
    super(`Cannot combine ${left} and ${right} amounts.`);
    this.name = 'CurrencyMismatchError';
  }
}

export class InvalidMinorAmountError extends Error {
  constructor(amountMinor: number) {
    super(`Minor amount must be a safe integer, received: ${amountMinor}.`);
    this.name = 'InvalidMinorAmountError';
  }
}

export const money = (amountMinor: number, currency: CurrencyCode): Money => {
  if (!Number.isSafeInteger(amountMinor)) {
    throw new InvalidMinorAmountError(amountMinor);
  }
  return { amountMinor, currency };
};

export const zeroMoney = (currency: CurrencyCode): Money => ({ amountMinor: 0, currency });

const assertSameCurrency = (a: Money, b: Money): void => {
  if (a.currency !== b.currency) {
    throw new CurrencyMismatchError(a.currency, b.currency);
  }
};

export const addMoney = (a: Money, b: Money): Money => {
  assertSameCurrency(a, b);
  return money(a.amountMinor + b.amountMinor, a.currency);
};

export const subtractMoney = (a: Money, b: Money): Money => {
  assertSameCurrency(a, b);
  return money(a.amountMinor - b.amountMinor, a.currency);
};

export const negateMoney = (a: Money): Money => money(-a.amountMinor, a.currency);

export const absMoney = (a: Money): Money => money(Math.abs(a.amountMinor), a.currency);

export const compareMoney = (a: Money, b: Money): number => {
  assertSameCurrency(a, b);
  return a.amountMinor - b.amountMinor;
};

export const isPositiveMoney = (a: Money): boolean => a.amountMinor > 0;

export const isZeroMoney = (a: Money): boolean => a.amountMinor === 0;

export const sumMoney = (values: readonly Money[], currency: CurrencyCode): Money =>
  values.reduce<Money>((acc, value) => addMoney(acc, value), zeroMoney(currency));

const PERCENT_SCALE = 100;

/** Rounding factor that keeps exactly one decimal place in the share. */
const PERCENT_ROUNDING_FACTOR = 10;

/**
 * Percentage share (0-100, one decimal) of `part` within `total`.
 * Returns 0 when the total is zero so the UI never renders NaN.
 */
export const percentageShare = (partMinor: number, totalMinor: number): number =>
  totalMinor === 0
    ? 0
    : Math.round((partMinor / totalMinor) * PERCENT_SCALE * PERCENT_ROUNDING_FACTOR) /
      PERCENT_ROUNDING_FACTOR;

const AMOUNT_PATTERN = /^-?\d+(?:[.,]\d+)?$/;

/**
 * Parses user input into integer minor units.
 *
 * Returns `null` for anything that is not a well-formed amount, or that
 * carries more decimals than the currency allows. Parsing works on digit
 * strings, so no floating point rounding can corrupt the result.
 */
export const parseAmountToMinor = (input: string, currency: CurrencyCode): number | null => {
  const normalised = input.trim().replace(/[\s\u00a0']/g, '');
  if (normalised === '' || !AMOUNT_PATTERN.test(normalised)) {
    return null;
  }

  const negative = normalised.startsWith('-');
  const unsigned = negative ? normalised.slice(1) : normalised;
  const [whole, fraction = ''] = unsigned.split(/[.,]/);
  const precision = precisionOf(currency);

  if (fraction.length > precision) {
    return null;
  }

  const digits = `${whole}${fraction.padEnd(precision, '0')}`;
  const value = Number(digits);

  if (!Number.isSafeInteger(value)) {
    return null;
  }
  return negative ? -value : value;
};

/** At least one whole digit is always rendered, so `5` cents becomes `0.05`. */
const MIN_WHOLE_DIGITS = 1;

/** Converts minor units into a plain major-unit string, e.g. `123456` -> `1234.56`. */
export const minorToDecimalString = (amountMinor: number, currency: CurrencyCode): string => {
  const precision = precisionOf(currency);
  const negative = amountMinor < 0;
  const digits = Math.abs(amountMinor)
    .toString()
    .padStart(precision + MIN_WHOLE_DIGITS, '0');
  const whole = digits.slice(0, digits.length - precision);
  const fraction = digits.slice(digits.length - precision);
  const decimal = precision === 0 ? whole : `${whole}.${fraction}`;
  return negative ? `-${decimal}` : decimal;
};

export interface FormatMoneyOptions {
  /** Always render an explicit `+` for positive amounts. */
  readonly signDisplay?: 'auto' | 'always' | 'never';
  /** Replace digits with a privacy mask (balance visibility toggle). */
  readonly hidden?: boolean;
  readonly locale?: string;
}

/** Privacy mask shown instead of digits when balances are hidden. */
export const MASKED_AMOUNT = '••••';

const resolveSign = (amountMinor: number, signDisplay: 'auto' | 'always' | 'never'): string => {
  if (signDisplay === 'never') {
    return '';
  }
  if (amountMinor < 0) {
    return '−';
  }
  return signDisplay === 'always' ? '+' : '';
};

/**
 * Formats a monetary value for display. Grouping/decimal separators come from
 * `Intl`, but the number handed to `Intl` is derived from the integer minor
 * amount, so the stored value stays authoritative.
 */
export const formatMoney = (value: Money, options: FormatMoneyOptions = {}): string => {
  const { signDisplay = 'auto', hidden = false, locale = 'en-IE' } = options;
  const symbol = CURRENCY_SYMBOL[value.currency];

  if (hidden) {
    return `${symbol}${MASKED_AMOUNT}`;
  }

  const precision = precisionOf(value.currency);
  const magnitude = Math.abs(value.amountMinor) / minorUnitScale(value.currency);
  const body = new Intl.NumberFormat(locale, {
    minimumFractionDigits: precision,
    maximumFractionDigits: precision,
  }).format(magnitude);

  return `${resolveSign(value.amountMinor, signDisplay)}${symbol}${body}`;
};
