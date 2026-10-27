import { describe, expect, it } from 'vitest';
import type { Account } from '../models/account.model';
import type { Transaction } from '../models/transaction.model';
import {
  monthRange,
  monthlySeries,
  periodTotals,
  spendingByCategory,
  totalAvailable,
  totalBalance,
} from './analytics';

const REFERENCE = new Date('2024-05-15T12:00:00.000Z');
const MAY = monthRange(REFERENCE);

const txn = (overrides: Partial<Transaction> & Pick<Transaction, 'id'>): Transaction => ({
  accountId: 'acc-current',
  counterparty: 'Shop',
  category: 'groceries',
  bookedAt: '2024-05-10T09:00:00.000Z',
  amountMinor: 1000,
  currency: 'EUR',
  direction: 'debit',
  status: 'completed',
  ...overrides,
});

describe('monthRange', () => {
  it('spans the calendar month of the reference date', () => {
    expect(MAY.startIso).toBe('2024-05-01T00:00:00.000Z');
    expect(MAY.endIso).toBe('2024-06-01T00:00:00.000Z');
  });

  it('walks backwards across a year boundary', () => {
    expect(monthRange(new Date('2024-01-10T00:00:00.000Z'), 1).startIso).toBe(
      '2023-12-01T00:00:00.000Z',
    );
  });
});

describe('totalBalance / totalAvailable', () => {
  const accounts: readonly Account[] = [
    {
      id: 'a',
      name: 'A',
      type: 'current',
      maskedIban: 'IE** 1',
      currency: 'EUR',
      balanceMinor: 1000,
      availableMinor: 900,
      status: 'active',
    },
    {
      id: 'b',
      name: 'B',
      type: 'savings',
      maskedIban: 'IE** 2',
      currency: 'EUR',
      balanceMinor: 2000,
      availableMinor: 2000,
      status: 'active',
    },
    {
      id: 'c',
      name: 'C',
      type: 'current',
      maskedIban: 'IE** 3',
      currency: 'EUR',
      balanceMinor: 9999,
      availableMinor: 9999,
      status: 'closed',
    },
  ];

  it('sums only active accounts of the requested currency', () => {
    expect(totalBalance(accounts, 'EUR').amountMinor).toBe(3000);
    expect(totalAvailable(accounts, 'EUR').amountMinor).toBe(2900);
    expect(totalBalance(accounts, 'GBP').amountMinor).toBe(0);
  });
});

describe('periodTotals', () => {
  it('separates income from expenses inside the period', () => {
    const totals = periodTotals(
      [
        txn({ id: '1', direction: 'credit', amountMinor: 250_000, category: 'income' }),
        txn({ id: '2', amountMinor: 4500 }),
        txn({ id: '3', amountMinor: 5500 }),
      ],
      MAY,
      'EUR',
    );

    expect(totals.income.amountMinor).toBe(250_000);
    expect(totals.expenses.amountMinor).toBe(10_000);
    expect(totals.net.amountMinor).toBe(240_000);
  });

  it('excludes internal transfers from both sides', () => {
    const totals = periodTotals(
      [
        txn({ id: 'd', category: 'transfer', transferId: 'trf-1', amountMinor: 20_000 }),
        txn({
          id: 'c',
          category: 'transfer',
          transferId: 'trf-1',
          direction: 'credit',
          amountMinor: 20_000,
        }),
      ],
      MAY,
      'EUR',
    );

    expect(totals.income.amountMinor).toBe(0);
    expect(totals.expenses.amountMinor).toBe(0);
  });

  it('ignores transactions outside the period and non-settling statuses', () => {
    const totals = periodTotals(
      [
        txn({ id: 'old', bookedAt: '2024-04-28T09:00:00.000Z' }),
        txn({ id: 'next', bookedAt: '2024-06-02T09:00:00.000Z' }),
        txn({ id: 'failed', status: 'failed' }),
      ],
      MAY,
      'EUR',
    );

    expect(totals.expenses.amountMinor).toBe(0);
  });
});

describe('spendingByCategory', () => {
  it('groups debits by category, sorted by size, with percentage shares', () => {
    const breakdown = spendingByCategory(
      [
        txn({ id: '1', category: 'groceries', amountMinor: 6000 }),
        txn({ id: '2', category: 'groceries', amountMinor: 2000 }),
        txn({ id: '3', category: 'transport', amountMinor: 2000 }),
        txn({ id: '4', category: 'income', direction: 'credit', amountMinor: 50_000 }),
      ],
      MAY,
      'EUR',
    );

    expect(breakdown).toHaveLength(2);
    expect(breakdown[0]).toMatchObject({ category: 'groceries', share: 80 });
    expect(breakdown[0]?.total.amountMinor).toBe(8000);
    expect(breakdown[1]).toMatchObject({ category: 'transport', share: 20 });
  });

  it('returns an empty breakdown when nothing was spent', () => {
    expect(spendingByCategory([], MAY, 'EUR')).toEqual([]);
  });
});

describe('monthlySeries', () => {
  it('returns the requested number of months, oldest first', () => {
    const series = monthlySeries([], REFERENCE, 'EUR', 6);
    expect(series).toHaveLength(6);
    expect(series[0]?.month).toBe('2023-12');
    expect(series.at(-1)?.month).toBe('2024-05');
  });

  it('places each transaction in its own month', () => {
    const series = monthlySeries(
      [
        txn({ id: '1', bookedAt: '2024-05-02T09:00:00.000Z', amountMinor: 1500 }),
        txn({ id: '2', bookedAt: '2024-04-02T09:00:00.000Z', amountMinor: 2500 }),
      ],
      REFERENCE,
      'EUR',
      6,
    );

    expect(series.at(-1)?.expenses.amountMinor).toBe(1500);
    expect(series.at(-2)?.expenses.amountMinor).toBe(2500);
  });
});
