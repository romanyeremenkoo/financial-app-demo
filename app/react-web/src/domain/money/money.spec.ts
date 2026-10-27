import { describe, expect, it } from 'vitest';
import {
  CurrencyMismatchError,
  InvalidMinorAmountError,
  MASKED_AMOUNT,
  addMoney,
  compareMoney,
  formatMoney,
  minorToDecimalString,
  money,
  parseAmountToMinor,
  percentageShare,
  subtractMoney,
  sumMoney,
} from './money';

describe('money', () => {
  it('rejects non-integer minor amounts', () => {
    expect(() => money(12.5, 'EUR')).toThrow(InvalidMinorAmountError);
    expect(() => money(Number.NaN, 'EUR')).toThrow(InvalidMinorAmountError);
  });

  it('refuses to combine different currencies', () => {
    expect(() => addMoney(money(100, 'EUR'), money(100, 'GBP'))).toThrow(CurrencyMismatchError);
    expect(() => subtractMoney(money(100, 'EUR'), money(100, 'GBP'))).toThrow(
      CurrencyMismatchError,
    );
    expect(() => compareMoney(money(100, 'EUR'), money(100, 'GBP'))).toThrow(CurrencyMismatchError);
  });

  it('adds and subtracts in minor units without floating point drift', () => {
    const total = sumMoney(
      [money(10, 'EUR'), money(20, 'EUR'), money(30, 'EUR'), money(1, 'EUR')],
      'EUR',
    );
    expect(total.amountMinor).toBe(61);
    expect(subtractMoney(money(1000, 'EUR'), money(1, 'EUR')).amountMinor).toBe(999);
  });
});

describe('parseAmountToMinor', () => {
  it.each([
    ['12.34', 1234],
    ['12,34', 1234],
    ['0.05', 5],
    ['5', 500],
    ['1 234.50', 123450],
    ['-7.25', -725],
  ])('parses %s to %i minor units', (input, expected) => {
    expect(parseAmountToMinor(input, 'EUR')).toBe(expected);
  });

  it.each(['', '  ', 'abc', '1.234', '12.3.4', '1e3', '--5', '€10'])(
    'rejects %s',
    (input: string) => {
      expect(parseAmountToMinor(input, 'EUR')).toBeNull();
    },
  );
});

describe('minorToDecimalString', () => {
  it.each([
    [1234, '12.34'],
    [5, '0.05'],
    [0, '0.00'],
    [-725, '-7.25'],
  ])('renders %i as %s', (minor, expected) => {
    expect(minorToDecimalString(minor, 'EUR')).toBe(expected);
  });
});

describe('percentageShare', () => {
  it('returns one decimal place', () => {
    expect(percentageShare(3333, 10000)).toBe(33.3);
  });

  it('never divides by zero', () => {
    expect(percentageShare(100, 0)).toBe(0);
  });
});

describe('formatMoney', () => {
  it('formats with the currency symbol and fixed precision', () => {
    expect(formatMoney(money(123456, 'EUR'), { locale: 'en-IE' })).toBe('€1,234.56');
  });

  it('renders an explicit sign only when asked', () => {
    expect(formatMoney(money(500, 'EUR'), { locale: 'en-IE' })).toBe('€5.00');
    expect(formatMoney(money(500, 'EUR'), { signDisplay: 'always', locale: 'en-IE' })).toBe(
      '+€5.00',
    );
    expect(formatMoney(money(-500, 'EUR'), { signDisplay: 'never', locale: 'en-IE' })).toBe(
      '€5.00',
    );
  });

  it('masks the digits when balances are hidden', () => {
    expect(formatMoney(money(123456, 'EUR'), { hidden: true })).toBe(`€${MASKED_AMOUNT}`);
  });
});
