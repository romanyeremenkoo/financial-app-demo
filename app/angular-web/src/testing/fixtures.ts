import { Account } from '../app/domain/models/account.model';
import { Card } from '../app/domain/models/card.model';
import { Transaction } from '../app/domain/models/transaction.model';
import { LedgerSnapshot } from '../app/domain/transfers/transfer-policy';

/** Deterministic fixtures shared by the unit tests. */

export const makeAccount = (overrides: Partial<Account> = {}): Account => ({
  id: 'acc-a',
  name: 'Everyday Current',
  type: 'current',
  maskedIban: 'IE29 •••• •••• 0001',
  currency: 'EUR',
  balanceMinor: 100_000,
  availableMinor: 100_000,
  status: 'active',
  ...overrides,
});

export const makeTransaction = (overrides: Partial<Transaction> = {}): Transaction => ({
  id: 'txn-1',
  accountId: 'acc-a',
  counterparty: 'Albert Heijn',
  category: 'groceries',
  bookedAt: '2026-03-10T10:00:00.000Z',
  amountMinor: 5_000,
  currency: 'EUR',
  direction: 'debit',
  status: 'completed',
  ...overrides,
});

export const makeCard = (overrides: Partial<Card> = {}): Card => ({
  id: 'card-1',
  accountId: 'acc-a',
  label: 'Everyday virtual card',
  holderName: 'Elena Vasquez',
  maskedNumber: '•••• •••• •••• 0000',
  expiry: '09/29',
  network: 'visa',
  status: 'active',
  ...overrides,
});

export const makeSnapshot = (
  accounts: readonly Account[],
  transactions: readonly Transaction[] = [],
): LedgerSnapshot => ({ accounts, transactions, transfers: [] });

/** Sum of every completed ledger movement for an account, in minor units. */
export const ledgerMovement = (transactions: readonly Transaction[], accountId: string): number =>
  transactions
    .filter(
      (transaction) => transaction.accountId === accountId && transaction.status === 'completed',
    )
    .reduce(
      (sum, transaction) =>
        transaction.direction === 'credit'
          ? sum + transaction.amountMinor
          : sum - transaction.amountMinor,
      0,
    );
