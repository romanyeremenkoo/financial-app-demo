import { describe, expect, it } from 'vitest';
import { makeAccount, makeTransaction } from '../../../testing/fixtures';
import {
  monthRange,
  monthlySeries,
  periodTotals,
  spendingByCategory,
  totalAvailable,
  totalBalance,
} from './analytics';

const MARCH = { startIso: '2026-03-01T00:00:00.000Z', endIso: '2026-04-01T00:00:00.000Z' };

describe('dashboard totals', () => {
  it('sums the balances of active accounts in the reporting currency', () => {
    const accounts = [
      makeAccount({ id: 'acc-a', balanceMinor: 482_350, availableMinor: 467_350 }),
      makeAccount({ id: 'acc-b', balanceMinor: 1_284_000, availableMinor: 1_284_000 }),
      makeAccount({ id: 'acc-c', balanceMinor: 96_275, availableMinor: 96_275 }),
    ];

    expect(totalBalance(accounts, 'EUR')).toEqual({ amountMinor: 1_862_625, currency: 'EUR' });
    expect(totalAvailable(accounts, 'EUR')).toEqual({ amountMinor: 1_847_625, currency: 'EUR' });
  });

  it('excludes closed accounts and foreign-currency accounts', () => {
    const accounts = [
      makeAccount({ id: 'acc-a', balanceMinor: 100_000, availableMinor: 100_000 }),
      makeAccount({ id: 'acc-closed', balanceMinor: 50_000, status: 'closed' }),
      makeAccount({ id: 'acc-gbp', balanceMinor: 70_000, currency: 'GBP' }),
    ];

    expect(totalBalance(accounts, 'EUR').amountMinor).toBe(100_000);
  });
});

describe('period totals', () => {
  const transactions = [
    makeTransaction({
      id: 't-salary',
      direction: 'credit',
      category: 'income',
      amountMinor: 325_000,
      bookedAt: '2026-03-25T09:00:00.000Z',
    }),
    makeTransaction({
      id: 't-rent',
      direction: 'debit',
      category: 'housing',
      amountMinor: 118_000,
      bookedAt: '2026-03-03T09:00:00.000Z',
    }),
    makeTransaction({
      id: 't-food',
      direction: 'debit',
      category: 'groceries',
      amountMinor: 6_235,
      bookedAt: '2026-03-05T09:00:00.000Z',
    }),
    makeTransaction({
      id: 't-prev-month',
      direction: 'debit',
      category: 'groceries',
      amountMinor: 9_999,
      bookedAt: '2026-02-05T09:00:00.000Z',
    }),
    makeTransaction({
      id: 't-pending',
      direction: 'debit',
      category: 'transport',
      amountMinor: 15_000,
      status: 'pending',
      bookedAt: '2026-03-20T09:00:00.000Z',
    }),
    makeTransaction({
      id: 't-transfer-out',
      direction: 'debit',
      category: 'transfer',
      amountMinor: 40_000,
      bookedAt: '2026-03-26T09:00:00.000Z',
    }),
    makeTransaction({
      id: 't-transfer-in',
      accountId: 'acc-b',
      direction: 'credit',
      category: 'transfer',
      amountMinor: 40_000,
      bookedAt: '2026-03-26T09:00:00.000Z',
    }),
  ];

  it('counts only completed, in-period, non-transfer entries', () => {
    const totals = periodTotals(transactions, MARCH, 'EUR');

    expect(totals.income.amountMinor).toBe(325_000);
    expect(totals.expenses.amountMinor).toBe(124_235);
    expect(totals.net.amountMinor).toBe(200_765);
  });

  it('keeps income and expenses balanced with the net figure', () => {
    const totals = periodTotals(transactions, MARCH, 'EUR');
    expect(totals.income.amountMinor - totals.expenses.amountMinor).toBe(totals.net.amountMinor);
  });

  it('derives an exclusive-end month range', () => {
    const range = monthRange(new Date('2026-03-17T12:00:00.000Z'));
    expect(range.startIso).toBe('2026-03-01T00:00:00.000Z');
    expect(range.endIso).toBe('2026-04-01T00:00:00.000Z');
  });
});

describe('spending by category', () => {
  const transactions = [
    makeTransaction({ id: 'a', category: 'groceries', amountMinor: 6_000 }),
    makeTransaction({ id: 'b', category: 'groceries', amountMinor: 4_000 }),
    makeTransaction({ id: 'c', category: 'housing', amountMinor: 10_000 }),
    makeTransaction({ id: 'd', category: 'dining', amountMinor: 5_000, status: 'failed' }),
    makeTransaction({
      id: 'e',
      category: 'income',
      direction: 'credit',
      amountMinor: 300_000,
    }),
    makeTransaction({ id: 'f', category: 'transfer', amountMinor: 25_000 }),
  ];

  it('groups completed debits and sorts by size', () => {
    const breakdown = spendingByCategory(transactions, MARCH, 'EUR');

    expect(breakdown.map((item) => item.category)).toEqual(['groceries', 'housing']);
    expect(breakdown[0].total.amountMinor).toBe(10_000);
    expect(breakdown[1].total.amountMinor).toBe(10_000);
  });

  it('produces shares that add up to 100 percent', () => {
    const breakdown = spendingByCategory(transactions, MARCH, 'EUR');
    const sum = breakdown.reduce((total, item) => total + item.share, 0);
    expect(sum).toBeCloseTo(100, 1);
  });

  it('returns an empty breakdown when nothing was spent', () => {
    expect(spendingByCategory([], MARCH, 'EUR')).toEqual([]);
  });
});

describe('monthly series', () => {
  it('returns one point per month, oldest first', () => {
    const transactions = [
      makeTransaction({
        id: 'm1',
        direction: 'credit',
        category: 'income',
        amountMinor: 100_000,
        bookedAt: '2026-03-10T09:00:00.000Z',
      }),
      makeTransaction({
        id: 'm2',
        amountMinor: 20_000,
        bookedAt: '2026-02-10T09:00:00.000Z',
      }),
    ];

    const series = monthlySeries(transactions, new Date('2026-03-20T00:00:00.000Z'), 'EUR', 3);

    expect(series.map((point) => point.month)).toEqual(['2026-01', '2026-02', '2026-03']);
    expect(series[1].expenses.amountMinor).toBe(20_000);
    expect(series[2].income.amountMinor).toBe(100_000);
  });
});
