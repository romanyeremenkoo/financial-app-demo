import { describe, expect, it } from 'vitest';
import type { Account } from '../models/account.model';
import type { TransferDraft } from '../models/transfer.model';
import {
  type LedgerSnapshot,
  type TransferIdentifiers,
  applyTransfer,
  validateTransfer,
} from './transfer-policy';

const account = (overrides: Partial<Account> & Pick<Account, 'id'>): Account => ({
  name: 'Everyday Current',
  type: 'current',
  maskedIban: 'IE** **** **** 1234',
  currency: 'EUR',
  balanceMinor: 100_000,
  availableMinor: 100_000,
  status: 'active',
  ...overrides,
});

const ACCOUNTS: readonly Account[] = [
  account({ id: 'acc-current' }),
  account({
    id: 'acc-savings',
    name: 'Rainy Day Savings',
    type: 'savings',
    balanceMinor: 50_000,
    availableMinor: 50_000,
  }),
  account({ id: 'acc-closed', name: 'Closed Account', status: 'closed' }),
  account({ id: 'acc-gbp', name: 'Sterling', currency: 'GBP' }),
];

const draft = (overrides: Partial<TransferDraft> = {}): TransferDraft => ({
  sourceAccountId: 'acc-current',
  destinationAccountId: 'acc-savings',
  amountMinor: 2500,
  currency: 'EUR',
  ...overrides,
});

const IDS: TransferIdentifiers = {
  transferId: 'trf-1',
  debitTransactionId: 'txn-debit',
  creditTransactionId: 'txn-credit',
  requestToken: 'req-1',
  bookedAt: '2024-05-01T10:00:00.000Z',
};

const snapshot = (): LedgerSnapshot => ({
  accounts: ACCOUNTS,
  transactions: [],
  transfers: [],
});

describe('validateTransfer', () => {
  it('accepts a well-formed internal transfer', () => {
    expect(validateTransfer(draft(), ACCOUNTS)).toEqual({ ok: true });
  });

  it.each<[string, TransferDraft, string]>([
    ['a missing source', draft({ sourceAccountId: null }), 'SOURCE_REQUIRED'],
    ['an unknown source', draft({ sourceAccountId: 'nope' }), 'SOURCE_NOT_FOUND'],
    ['an ineligible source', draft({ sourceAccountId: 'acc-closed' }), 'SOURCE_INELIGIBLE'],
    ['a missing destination', draft({ destinationAccountId: null }), 'DESTINATION_REQUIRED'],
    ['an unknown destination', draft({ destinationAccountId: 'nope' }), 'DESTINATION_NOT_FOUND'],
    [
      'an ineligible destination',
      draft({ destinationAccountId: 'acc-closed' }),
      'DESTINATION_INELIGIBLE',
    ],
    ['the same account twice', draft({ destinationAccountId: 'acc-current' }), 'SAME_ACCOUNT'],
    ['a missing amount', draft({ amountMinor: null }), 'AMOUNT_REQUIRED'],
    ['a zero amount', draft({ amountMinor: 0 }), 'AMOUNT_NOT_POSITIVE'],
    ['a negative amount', draft({ amountMinor: -100 }), 'AMOUNT_NOT_POSITIVE'],
    ['a fractional minor amount', draft({ amountMinor: 10.5 }), 'AMOUNT_PRECISION'],
    ['a currency mismatch', draft({ destinationAccountId: 'acc-gbp' }), 'CURRENCY_MISMATCH'],
    ['insufficient funds', draft({ amountMinor: 100_001 }), 'INSUFFICIENT_FUNDS'],
  ])('rejects %s', (_label, candidate, expected) => {
    const result = validateTransfer(candidate, ACCOUNTS);
    expect(result.ok).toBe(false);
    expect(result.ok ? [] : result.errors).toContain(expected);
  });
});

describe('applyTransfer', () => {
  it('produces exactly two balancing ledger entries', () => {
    const result = applyTransfer(snapshot(), draft(), IDS);
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    const legs = result.snapshot.transactions.filter((txn) => txn.transferId === 'trf-1');
    expect(legs).toHaveLength(2);

    const debit = legs.find((txn) => txn.direction === 'debit');
    const credit = legs.find((txn) => txn.direction === 'credit');
    expect(debit?.accountId).toBe('acc-current');
    expect(credit?.accountId).toBe('acc-savings');
    expect(debit?.amountMinor).toBe(2500);
    expect(credit?.amountMinor).toBe(2500);

    const signed = legs.reduce(
      (total, txn) => total + (txn.direction === 'debit' ? -txn.amountMinor : txn.amountMinor),
      0,
    );
    expect(signed).toBe(0);
  });

  it('moves the money between the two accounts and leaves the rest untouched', () => {
    const result = applyTransfer(snapshot(), draft(), IDS);
    if (!result.ok) {
      throw new Error('expected success');
    }

    const source = result.snapshot.accounts.find((acc) => acc.id === 'acc-current');
    const destination = result.snapshot.accounts.find((acc) => acc.id === 'acc-savings');
    const untouched = result.snapshot.accounts.find((acc) => acc.id === 'acc-gbp');

    expect(source?.balanceMinor).toBe(97_500);
    expect(source?.availableMinor).toBe(97_500);
    expect(destination?.balanceMinor).toBe(52_500);
    expect(destination?.availableMinor).toBe(52_500);
    expect(untouched?.balanceMinor).toBe(100_000);
  });

  it('keeps the total ledger balance unchanged', () => {
    const before = snapshot().accounts.reduce((sum, acc) => sum + acc.balanceMinor, 0);
    const result = applyTransfer(snapshot(), draft(), IDS);
    if (!result.ok) {
      throw new Error('expected success');
    }
    const after = result.snapshot.accounts.reduce((sum, acc) => sum + acc.balanceMinor, 0);
    expect(after).toBe(before);
  });

  it('does not mutate the input snapshot', () => {
    const original = snapshot();
    applyTransfer(original, draft(), IDS);
    expect(original.transactions).toHaveLength(0);
    expect(original.accounts[0]?.balanceMinor).toBe(100_000);
  });

  it('changes nothing when the draft is invalid', () => {
    const result = applyTransfer(snapshot(), draft({ amountMinor: 999_999 }), IDS);
    expect(result.ok).toBe(false);
    expect(result.ok ? [] : result.errors).toContain('INSUFFICIENT_FUNDS');
  });

  it('normalises a blank reference to undefined', () => {
    const result = applyTransfer(snapshot(), draft({ reference: '   ' }), IDS);
    if (!result.ok) {
      throw new Error('expected success');
    }
    expect(result.transfer.reference).toBeUndefined();
  });

  it('links the transfer record to both legs', () => {
    const result = applyTransfer(snapshot(), draft({ reference: ' Rent ' }), IDS);
    if (!result.ok) {
      throw new Error('expected success');
    }
    expect(result.transfer).toMatchObject({
      id: 'trf-1',
      debitTransactionId: 'txn-debit',
      creditTransactionId: 'txn-credit',
      requestToken: 'req-1',
      status: 'completed',
      reference: 'Rent',
    });
  });
});
