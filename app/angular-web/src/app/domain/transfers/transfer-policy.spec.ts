import { describe, expect, it } from 'vitest';
import { ledgerMovement, makeAccount, makeSnapshot } from '../../../testing/fixtures';
import { TransferDraft } from '../models/transfer.model';
import { TransferIdentifiers, applyTransfer, validateTransfer } from './transfer-policy';

const SOURCE = makeAccount({
  id: 'acc-source',
  name: 'Everyday Current',
  balanceMinor: 100_000,
  availableMinor: 90_000,
});

const DESTINATION = makeAccount({
  id: 'acc-destination',
  name: 'Reserve Savings',
  type: 'savings',
  balanceMinor: 250_000,
  availableMinor: 250_000,
});

const ACCOUNTS = [SOURCE, DESTINATION];

const IDS: TransferIdentifiers = {
  transferId: 'trf-1',
  debitTransactionId: 'txn-debit-1',
  creditTransactionId: 'txn-credit-1',
  requestToken: 'req-1',
  bookedAt: '2026-03-20T12:00:00.000Z',
};

const draft = (overrides: Partial<TransferDraft> = {}): TransferDraft => ({
  sourceAccountId: SOURCE.id,
  destinationAccountId: DESTINATION.id,
  amountMinor: 25_000,
  currency: 'EUR',
  ...overrides,
});

describe('transfer validation', () => {
  it('accepts a well-formed transfer', () => {
    expect(validateTransfer(draft(), ACCOUNTS)).toEqual({ ok: true });
  });

  it('requires both accounts to be selected', () => {
    const result = validateTransfer(
      draft({ sourceAccountId: null, destinationAccountId: null }),
      ACCOUNTS,
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors).toContain('SOURCE_REQUIRED');
      expect(result.errors).toContain('DESTINATION_REQUIRED');
    }
  });

  it('rejects a transfer to the same account', () => {
    const result = validateTransfer(draft({ destinationAccountId: SOURCE.id }), ACCOUNTS);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors).toContain('SAME_ACCOUNT');
    }
  });

  it('rejects unknown accounts', () => {
    const result = validateTransfer(draft({ destinationAccountId: 'acc-missing' }), ACCOUNTS);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors).toContain('DESTINATION_NOT_FOUND');
    }
  });

  it('rejects ineligible (closed) accounts', () => {
    const accounts = [SOURCE, { ...DESTINATION, status: 'closed' as const }];
    const result = validateTransfer(draft(), accounts);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors).toContain('DESTINATION_INELIGIBLE');
    }
  });

  it('rejects non-positive and missing amounts', () => {
    for (const amountMinor of [0, -1]) {
      const result = validateTransfer(draft({ amountMinor }), ACCOUNTS);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.errors).toContain('AMOUNT_NOT_POSITIVE');
      }
    }

    const missing = validateTransfer(draft({ amountMinor: null }), ACCOUNTS);
    expect(missing.ok).toBe(false);
    if (!missing.ok) {
      expect(missing.errors).toContain('AMOUNT_REQUIRED');
    }
  });

  it('rejects amounts that are not whole minor units', () => {
    const result = validateTransfer(draft({ amountMinor: 1_000.5 }), ACCOUNTS);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors).toContain('AMOUNT_PRECISION');
    }
  });

  it('rejects currency mismatches between the accounts', () => {
    const accounts = [SOURCE, { ...DESTINATION, currency: 'GBP' as const }];
    const result = validateTransfer(draft(), accounts);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors).toContain('CURRENCY_MISMATCH');
    }
  });

  it('checks available funds, not the booked balance', () => {
    // Booked balance is 100000 but only 90000 is available.
    const result = validateTransfer(draft({ amountMinor: 95_000 }), ACCOUNTS);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors).toContain('INSUFFICIENT_FUNDS');
    }

    expect(validateTransfer(draft({ amountMinor: 90_000 }), ACCOUNTS)).toEqual({ ok: true });
  });
});

describe('applying a transfer', () => {
  it('moves funds and books a linked debit and credit', () => {
    const outcome = applyTransfer(makeSnapshot(ACCOUNTS), draft({ reference: ' Savings ' }), IDS);

    expect(outcome.ok).toBe(true);
    if (!outcome.ok) {
      return;
    }

    const source = outcome.snapshot.accounts.find((a) => a.id === SOURCE.id);
    const destination = outcome.snapshot.accounts.find((a) => a.id === DESTINATION.id);

    expect(source?.balanceMinor).toBe(75_000);
    expect(source?.availableMinor).toBe(65_000);
    expect(destination?.balanceMinor).toBe(275_000);
    expect(destination?.availableMinor).toBe(275_000);

    expect(outcome.snapshot.transactions).toHaveLength(2);
    const debit = outcome.snapshot.transactions.find((t) => t.id === IDS.debitTransactionId);
    const credit = outcome.snapshot.transactions.find((t) => t.id === IDS.creditTransactionId);

    expect(debit).toMatchObject({
      accountId: SOURCE.id,
      direction: 'debit',
      amountMinor: 25_000,
      category: 'transfer',
      status: 'completed',
      transferId: IDS.transferId,
      reference: 'Savings',
    });
    expect(credit).toMatchObject({
      accountId: DESTINATION.id,
      direction: 'credit',
      amountMinor: 25_000,
      transferId: IDS.transferId,
    });
  });

  it('keeps the ledger balanced: the two legs net to zero', () => {
    const outcome = applyTransfer(makeSnapshot(ACCOUNTS), draft(), IDS);
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) {
      return;
    }

    const movement = outcome.snapshot.transactions.reduce(
      (sum, t) => (t.direction === 'credit' ? sum + t.amountMinor : sum - t.amountMinor),
      0,
    );
    expect(movement).toBe(0);

    const totalBefore = ACCOUNTS.reduce((sum, a) => sum + a.balanceMinor, 0);
    const totalAfter = outcome.snapshot.accounts.reduce((sum, a) => sum + a.balanceMinor, 0);
    expect(totalAfter).toBe(totalBefore);
  });

  it('matches each account balance change to its ledger movement', () => {
    const outcome = applyTransfer(makeSnapshot(ACCOUNTS), draft(), IDS);
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) {
      return;
    }

    for (const before of ACCOUNTS) {
      const after = outcome.snapshot.accounts.find((a) => a.id === before.id);
      const movement = ledgerMovement(outcome.snapshot.transactions, before.id);
      expect(after?.balanceMinor).toBe(before.balanceMinor + movement);
    }
  });

  it('does not mutate the input snapshot', () => {
    const snapshot = makeSnapshot(ACCOUNTS);
    applyTransfer(snapshot, draft(), IDS);

    expect(snapshot.accounts[0].balanceMinor).toBe(100_000);
    expect(snapshot.transactions).toHaveLength(0);
    expect(snapshot.transfers).toHaveLength(0);
  });

  it('leaves balances untouched when validation fails', () => {
    const snapshot = makeSnapshot(ACCOUNTS);
    const outcome = applyTransfer(snapshot, draft({ amountMinor: 900_000 }), IDS);

    expect(outcome.ok).toBe(false);
    if (outcome.ok) {
      return;
    }
    expect(outcome.errors).toContain('INSUFFICIENT_FUNDS');
    expect(snapshot.accounts[0].balanceMinor).toBe(100_000);
  });

  it('normalises a blank reference to undefined', () => {
    const outcome = applyTransfer(makeSnapshot(ACCOUNTS), draft({ reference: '   ' }), IDS);
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) {
      return;
    }
    expect(outcome.transfer.reference).toBeUndefined();
  });
});
