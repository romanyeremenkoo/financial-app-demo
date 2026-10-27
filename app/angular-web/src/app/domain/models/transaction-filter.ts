import { AccountId } from '../models/account.model';
import {
  Transaction,
  TransactionCategory,
  TransactionDirection,
} from '../models/transaction.model';

export type TransactionSort = 'date-desc' | 'date-asc' | 'amount-desc' | 'amount-asc';

export interface TransactionFilter {
  readonly search: string;
  readonly category: TransactionCategory | 'all';
  readonly direction: TransactionDirection | 'all';
  readonly accountId: AccountId | 'all';
  readonly sort: TransactionSort;
}

export const DEFAULT_TRANSACTION_FILTER: TransactionFilter = {
  search: '',
  category: 'all',
  direction: 'all',
  accountId: 'all',
  sort: 'date-desc',
};

export const isDefaultFilter = (filter: TransactionFilter): boolean =>
  filter.search.trim() === '' &&
  filter.category === 'all' &&
  filter.direction === 'all' &&
  filter.accountId === 'all' &&
  filter.sort === DEFAULT_TRANSACTION_FILTER.sort;

export const activeFilterCount = (filter: TransactionFilter): number =>
  [
    filter.search.trim() !== '',
    filter.category !== 'all',
    filter.direction !== 'all',
    filter.accountId !== 'all',
  ].filter(Boolean).length;

type Predicate = (transaction: Transaction) => boolean;

const matchesSearch = (search: string): Predicate => {
  const needle = search.trim().toLowerCase();
  if (needle === '') {
    return () => true;
  }
  return (transaction) =>
    transaction.counterparty.toLowerCase().includes(needle) ||
    (transaction.reference ?? '').toLowerCase().includes(needle);
};

const matchesCategory = (category: TransactionCategory | 'all'): Predicate =>
  category === 'all' ? () => true : (transaction) => transaction.category === category;

const matchesDirection = (direction: TransactionDirection | 'all'): Predicate =>
  direction === 'all' ? () => true : (transaction) => transaction.direction === direction;

const matchesAccount = (accountId: AccountId | 'all'): Predicate =>
  accountId === 'all' ? () => true : (transaction) => transaction.accountId === accountId;

const COMPARATORS: Readonly<Record<TransactionSort, (a: Transaction, b: Transaction) => number>> = {
  'date-desc': (a, b) => b.bookedAt.localeCompare(a.bookedAt) || a.id.localeCompare(b.id),
  'date-asc': (a, b) => a.bookedAt.localeCompare(b.bookedAt) || a.id.localeCompare(b.id),
  'amount-desc': (a, b) => b.amountMinor - a.amountMinor || a.id.localeCompare(b.id),
  'amount-asc': (a, b) => a.amountMinor - b.amountMinor || a.id.localeCompare(b.id),
};

/**
 * Applies every active filter and then a stable sort. Predicates are composed
 * rather than chained through nested conditionals so new filters stay additive.
 */
export const filterTransactions = (
  transactions: readonly Transaction[],
  filter: TransactionFilter,
): readonly Transaction[] => {
  const predicates: readonly Predicate[] = [
    matchesSearch(filter.search),
    matchesCategory(filter.category),
    matchesDirection(filter.direction),
    matchesAccount(filter.accountId),
  ];

  return transactions
    .filter((transaction) => predicates.every((predicate) => predicate(transaction)))
    .slice()
    .sort(COMPARATORS[filter.sort]);
};
