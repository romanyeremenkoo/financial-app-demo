import { describe, expect, it } from 'vitest';
import type { Transaction } from './transaction.model';
import {
  DEFAULT_TRANSACTION_FILTER,
  type TransactionFilter,
  activeFilterCount,
  filterTransactions,
  isDefaultFilter,
} from './transaction-filter';

const txn = (overrides: Partial<Transaction> & Pick<Transaction, 'id'>): Transaction => ({
  accountId: 'acc-current',
  counterparty: 'Corner Grocer',
  category: 'groceries',
  bookedAt: '2024-05-10T09:00:00.000Z',
  amountMinor: 1000,
  currency: 'EUR',
  direction: 'debit',
  status: 'completed',
  ...overrides,
});

const TRANSACTIONS: readonly Transaction[] = [
  txn({ id: 'a', counterparty: 'Corner Grocer', amountMinor: 3000 }),
  txn({
    id: 'b',
    counterparty: 'Metro Transit',
    category: 'transport',
    bookedAt: '2024-05-11T09:00:00.000Z',
    amountMinor: 500,
  }),
  txn({
    id: 'c',
    counterparty: 'Northwind Payroll',
    category: 'income',
    direction: 'credit',
    accountId: 'acc-savings',
    bookedAt: '2024-05-01T09:00:00.000Z',
    amountMinor: 250_000,
    reference: 'May salary',
  }),
];

const filter = (overrides: Partial<TransactionFilter> = {}): TransactionFilter => ({
  ...DEFAULT_TRANSACTION_FILTER,
  ...overrides,
});

describe('filterTransactions', () => {
  it('returns everything sorted newest first by default', () => {
    expect(filterTransactions(TRANSACTIONS, filter()).map((t) => t.id)).toEqual(['b', 'a', 'c']);
  });

  it('searches the counterparty case-insensitively', () => {
    expect(filterTransactions(TRANSACTIONS, filter({ search: 'grocer' })).map((t) => t.id)).toEqual(
      ['a'],
    );
  });

  it('searches the reference as well', () => {
    expect(
      filterTransactions(TRANSACTIONS, filter({ search: 'may salary' })).map((t) => t.id),
    ).toEqual(['c']);
  });

  it('filters by category, direction and account', () => {
    expect(
      filterTransactions(TRANSACTIONS, filter({ category: 'transport' })).map((t) => t.id),
    ).toEqual(['b']);
    expect(
      filterTransactions(TRANSACTIONS, filter({ direction: 'credit' })).map((t) => t.id),
    ).toEqual(['c']);
    expect(
      filterTransactions(TRANSACTIONS, filter({ accountId: 'acc-savings' })).map((t) => t.id),
    ).toEqual(['c']);
  });

  it('combines filters', () => {
    expect(
      filterTransactions(TRANSACTIONS, filter({ direction: 'debit', search: 'metro' })).map(
        (t) => t.id,
      ),
    ).toEqual(['b']);
  });

  it('sorts by date and amount in both directions', () => {
    expect(filterTransactions(TRANSACTIONS, filter({ sort: 'date-asc' })).map((t) => t.id)).toEqual(
      ['c', 'a', 'b'],
    );
    expect(
      filterTransactions(TRANSACTIONS, filter({ sort: 'amount-desc' })).map((t) => t.id),
    ).toEqual(['c', 'a', 'b']);
    expect(
      filterTransactions(TRANSACTIONS, filter({ sort: 'amount-asc' })).map((t) => t.id),
    ).toEqual(['b', 'a', 'c']);
  });

  it('never mutates the source collection', () => {
    const input = [...TRANSACTIONS];
    filterTransactions(input, filter({ sort: 'amount-asc' }));
    expect(input.map((t) => t.id)).toEqual(['a', 'b', 'c']);
  });

  it('returns an empty list when nothing matches', () => {
    expect(filterTransactions(TRANSACTIONS, filter({ search: 'nothing here' }))).toEqual([]);
  });
});

describe('filter state helpers', () => {
  it('recognises the default filter', () => {
    expect(isDefaultFilter(DEFAULT_TRANSACTION_FILTER)).toBe(true);
    expect(isDefaultFilter(filter({ search: '   ' }))).toBe(true);
    expect(isDefaultFilter(filter({ category: 'transport' }))).toBe(false);
  });

  it('counts the active filters, ignoring the sort order', () => {
    expect(activeFilterCount(DEFAULT_TRANSACTION_FILTER)).toBe(0);
    expect(activeFilterCount(filter({ sort: 'amount-asc' }))).toBe(0);
    expect(activeFilterCount(filter({ search: 'x', category: 'transport' }))).toBe(2);
  });
});
