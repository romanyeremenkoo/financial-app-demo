import { describe, expect, it } from 'vitest';
import {
  CurrencyMismatchError,
  addMoney,
  compareMoney,
  formatMoney,
  minorToDecimalString,
  money,
  parseAmountToMinor,
  percentageShare,
  subtractMoney,
  sumMoney,
  zeroMoney,
} from './money';

describe('money arithmetic', () => {
  it('rejects non-integer minor amounts', () => {
    expect(() => money(10.5, 'EUR')).toThrowError(/safe integer/);
  });

  it('adds and subtracts without floating point drift', () => {
    // 0.1 + 0.2 in minor units must be exactly 0.30.
    const result = addMoney(money(10, 'EUR'), money(20, 'EUR'));
    expect(result.amountMinor).toBe(30);
    expect(formatMoney(result)).toBe('€0.30');

    const difference = subtractMoney(money(100_00, 'EUR'), money(33_33, 'EUR'));
    expect(difference.amountMinor).toBe(6_667);
  });

  it('refuses to combine different currencies', () => {
    expect(() => addMoney(money(100, 'EUR'), money(100, 'GBP'))).toThrow(CurrencyMismatchError);
    expect(() => compareMoney(money(100, 'EUR'), money(100, 'GBP'))).toThrow(CurrencyMismatchError);
  });

  it('sums a collection starting from zero', () => {
    const total = sumMoney([money(1_250, 'EUR'), money(99, 'EUR'), money(-349, 'EUR')], 'EUR');
    expect(total).toEqual({ amountMinor: 1_000, currency: 'EUR' });
    expect(sumMoney([], 'EUR')).toEqual(zeroMoney('EUR'));
  });

  it('computes percentage shares and tolerates a zero total', () => {
    expect(percentageShare(2_500, 10_000)).toBe(25);
    expect(percentageShare(1, 3)).toBe(33.3);
    expect(percentageShare(500, 0)).toBe(0);
  });
});

describe('currency precision parsing', () => {
  it('accepts well-formed amounts with either separator', () => {
    expect(parseAmountToMinor('125.50', 'EUR')).toBe(12_550);
    expect(parseAmountToMinor('125,5', 'EUR')).toBe(12_550);
    expect(parseAmountToMinor('1 234.07', 'EUR')).toBe(123_407);
    expect(parseAmountToMinor('0.01', 'EUR')).toBe(1);
  });

  it('rejects more decimals than the currency allows', () => {
    expect(parseAmountToMinor('10.001', 'EUR')).toBeNull();
    expect(parseAmountToMinor('10.555', 'GBP')).toBeNull();
  });

  it('rejects malformed input', () => {
    for (const input of ['', '   ', 'abc', '10.', '.5', '1.2.3', '10e3', '--5']) {
      expect(parseAmountToMinor(input, 'EUR')).toBeNull();
    }
  });

  it('round-trips between minor units and decimal strings', () => {
    expect(minorToDecimalString(123_456, 'EUR')).toBe('1234.56');
    expect(minorToDecimalString(5, 'EUR')).toBe('0.05');
    expect(minorToDecimalString(-99, 'EUR')).toBe('-0.99');
    expect(parseAmountToMinor(minorToDecimalString(987_65, 'EUR'), 'EUR')).toBe(98_765);
  });
});

describe('money formatting', () => {
  it('formats with the currency symbol and fixed precision', () => {
    expect(formatMoney(money(482_350, 'EUR'))).toBe('€4,823.50');
    expect(formatMoney(money(0, 'EUR'))).toBe('€0.00');
  });

  it('honours the sign display mode', () => {
    expect(formatMoney(money(5_000, 'EUR'), { signDisplay: 'always' })).toBe('+€50.00');
    expect(formatMoney(money(-5_000, 'EUR'))).toBe('−€50.00');
    expect(formatMoney(money(-5_000, 'EUR'), { signDisplay: 'never' })).toBe('€50.00');
  });

  it('masks the amount when balances are hidden', () => {
    expect(formatMoney(money(482_350, 'EUR'), { hidden: true })).toBe('€••••');
  });
});
