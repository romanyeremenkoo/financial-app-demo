import { describe, expect, it } from 'vitest';
import { makeTransaction } from '../../../testing/fixtures';
import {
  DEFAULT_TRANSACTION_FILTER,
  TransactionFilter,
  activeFilterCount,
  filterTransactions,
  isDefaultFilter,
} from './transaction-filter';

const TRANSACTIONS = [
  makeTransaction({
    id: 't1',
    counterparty: 'Albert Heijn',
    category: 'groceries',
    amountMinor: 6_235,
    bookedAt: '2026-03-05T09:00:00.000Z',
  }),
  makeTransaction({
    id: 't2',
    counterparty: 'Northwind Analytics',
    category: 'income',
    direction: 'credit',
    amountMinor: 325_000,
    bookedAt: '2026-03-25T09:00:00.000Z',
    reference: 'Monthly salary',
  }),
  makeTransaction({
    id: 't3',
    accountId: 'acc-b',
    counterparty: 'Lidl',
    category: 'groceries',
    amountMinor: 3_820,
    bookedAt: '2026-03-12T09:00:00.000Z',
  }),
  makeTransaction({
    id: 't4',
    counterparty: 'Bolt Ride',
    category: 'transport',
    amountMinor: 1_475,
    bookedAt: '2026-03-16T09:00:00.000Z',
  }),
];

const filterWith = (overrides: Partial<TransactionFilter>): TransactionFilter => ({
  ...DEFAULT_TRANSACTION_FILTER,
  ...overrides,
});

describe('transaction filtering', () => {
  it('returns everything, newest first, with the default filter', () => {
    const result = filterTransactions(TRANSACTIONS, DEFAULT_TRANSACTION_FILTER);
    expect(result.map((t) => t.id)).toEqual(['t2', 't4', 't3', 't1']);
  });

  it('matches the search term against counterparty and reference, case-insensitively', () => {
    expect(
      filterTransactions(TRANSACTIONS, filterWith({ search: 'heijn' })).map((t) => t.id),
    ).toEqual(['t1']);
    expect(
      filterTransactions(TRANSACTIONS, filterWith({ search: 'monthly SALARY' })).map((t) => t.id),
    ).toEqual(['t2']);
    expect(filterTransactions(TRANSACTIONS, filterWith({ search: '   ' })).length).toBe(4);
  });

  it('filters by category, direction and account', () => {
    expect(
      filterTransactions(TRANSACTIONS, filterWith({ category: 'groceries' })).map((t) => t.id),
    ).toEqual(['t3', 't1']);
    expect(
      filterTransactions(TRANSACTIONS, filterWith({ direction: 'credit' })).map((t) => t.id),
    ).toEqual(['t2']);
    expect(
      filterTransactions(TRANSACTIONS, filterWith({ accountId: 'acc-b' })).map((t) => t.id),
    ).toEqual(['t3']);
  });

  it('composes several filters at once', () => {
    const result = filterTransactions(
      TRANSACTIONS,
      filterWith({ category: 'groceries', direction: 'debit', accountId: 'acc-a' }),
    );
    expect(result.map((t) => t.id)).toEqual(['t1']);
  });

  it('returns an empty list when nothing matches', () => {
    expect(filterTransactions(TRANSACTIONS, filterWith({ search: 'nothing here' }))).toEqual([]);
  });

  it('sorts by date and amount in both directions', () => {
    expect(
      filterTransactions(TRANSACTIONS, filterWith({ sort: 'date-asc' })).map((t) => t.id),
    ).toEqual(['t1', 't3', 't4', 't2']);
    expect(
      filterTransactions(TRANSACTIONS, filterWith({ sort: 'amount-desc' })).map((t) => t.id),
    ).toEqual(['t2', 't1', 't3', 't4']);
    expect(
      filterTransactions(TRANSACTIONS, filterWith({ sort: 'amount-asc' })).map((t) => t.id),
    ).toEqual(['t4', 't3', 't1', 't2']);
  });

  it('never mutates the source collection', () => {
    const snapshot = [...TRANSACTIONS];
    filterTransactions(TRANSACTIONS, filterWith({ sort: 'amount-asc' }));
    expect(TRANSACTIONS).toEqual(snapshot);
  });

  it('reports which filters are active', () => {
    expect(isDefaultFilter(DEFAULT_TRANSACTION_FILTER)).toBe(true);
    expect(activeFilterCount(DEFAULT_TRANSACTION_FILTER)).toBe(0);

    const applied = filterWith({ search: 'lidl', category: 'groceries' });
    expect(isDefaultFilter(applied)).toBe(false);
    expect(activeFilterCount(applied)).toBe(2);
  });
});
