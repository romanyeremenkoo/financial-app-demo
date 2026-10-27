import type { CurrencyCode } from '../money/currency';
import { type Money, money } from '../money/money';
import type { AccountId } from './account.model';
import type { TransferId } from './transfer.model';

export type TransactionId = string;

/** `debit` leaves the account, `credit` arrives in the account. */
export type TransactionDirection = 'debit' | 'credit';

export type TransactionStatus = 'completed' | 'pending' | 'failed';

export type TransactionCategory =
  | 'groceries'
  | 'dining'
  | 'transport'
  | 'housing'
  | 'utilities'
  | 'shopping'
  | 'health'
  | 'entertainment'
  | 'income'
  | 'transfer';

/**
 * A single ledger entry on one account.
 *
 * `amountMinor` is always a positive integer; the sign is carried by
 * `direction`. An internal transfer produces exactly two transactions sharing
 * the same `transferId`: a debit on the source and a credit on the destination.
 */
export interface Transaction {
  readonly id: TransactionId;
  readonly accountId: AccountId;
  readonly counterparty: string;
  readonly category: TransactionCategory;
  /** ISO-8601 timestamp of when the entry was booked. */
  readonly bookedAt: string;
  readonly amountMinor: number;
  readonly currency: CurrencyCode;
  readonly direction: TransactionDirection;
  readonly status: TransactionStatus;
  readonly reference?: string;
  readonly transferId?: TransferId;
}

export const TRANSACTION_CATEGORIES: readonly TransactionCategory[] = [
  'groceries',
  'dining',
  'transport',
  'housing',
  'utilities',
  'shopping',
  'health',
  'entertainment',
  'income',
  'transfer',
];

export const TRANSACTION_DIRECTIONS: readonly TransactionDirection[] = ['debit', 'credit'];

/** Signed value of the entry: debits are negative, credits positive. */
export const signedAmount = (transaction: Transaction): Money =>
  money(
    (transaction.direction === 'debit' ? -1 : 1) * transaction.amountMinor,
    transaction.currency,
  );

export const transactionAmount = (transaction: Transaction): Money =>
  money(transaction.amountMinor, transaction.currency);

/**
 * Only completed entries affect reported balances and analytics. Pending and
 * failed entries are shown in the history but never counted twice.
 */
export const affectsBalance = (transaction: Transaction): boolean =>
  transaction.status === 'completed';

/** Internal transfers are excluded from income/expense analytics. */
export const isInternalTransfer = (transaction: Transaction): boolean =>
  transaction.category === 'transfer';
