import { SpectatorService, createServiceFactory } from '@ngneat/spectator/vitest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ledgerMovement, makeAccount, makeCard, makeSnapshot } from '../../../testing/fixtures';
import { provideTestDataSource } from '../../../testing/data-source';
import { TransferDraft } from '../../domain/models/transfer.model';
import { DemoBankingDataSource } from '../../data/demo/demo-banking.data-source';
import { BankingStore } from '../state/banking.store';
import { TransferResult, TransferService } from './transfer.service';

const SOURCE = makeAccount({
  id: 'acc-source',
  name: 'Everyday Current',
  balanceMinor: 100_000,
  availableMinor: 100_000,
});

const DESTINATION = makeAccount({
  id: 'acc-destination',
  name: 'Reserve Savings',
  type: 'savings',
  balanceMinor: 50_000,
  availableMinor: 50_000,
});

/** Longer than the simulated settlement latency. */
const SETTLEMENT_WINDOW_MS = 1_000;

const draft = (overrides: Partial<TransferDraft> = {}): TransferDraft => ({
  sourceAccountId: SOURCE.id,
  destinationAccountId: DESTINATION.id,
  amountMinor: 30_000,
  currency: 'EUR',
  ...overrides,
});

describe('TransferService', () => {
  let spectator: SpectatorService<TransferService>;
  let service: TransferService;
  let store: BankingStore;

  const createService = createServiceFactory({
    service: TransferService,
    providers: [BankingStore, provideTestDataSource()],
  });

  /** Subscribes, advances the fake clock and returns the single emission. */
  const execute = (input: TransferDraft, token: string): TransferResult => {
    const emissions: TransferResult[] = [];
    service.execute(input, token).subscribe((result) => emissions.push(result));
    vi.advanceTimersByTime(SETTLEMENT_WINDOW_MS);

    expect(emissions).toHaveLength(1);
    return emissions[0];
  };

  beforeEach(() => {
    vi.useFakeTimers();
    localStorage.clear();
    spectator = createService();
    service = spectator.service;
    store = spectator.inject(BankingStore);

    // The adapter owns the ledger; the store mirrors the snapshots it returns.
    const snapshot = { ...makeSnapshot([SOURCE, DESTINATION]), cards: [makeCard()] };
    spectator.inject<DemoBankingDataSource>(DemoBankingDataSource).hydrate(snapshot);
    store.hydrate(makeSnapshot([SOURCE, DESTINATION]), [makeCard()]);
  });

  afterEach(() => {
    vi.useRealTimers();
    localStorage.clear();
  });

  it('completes a valid transfer and updates both balances', () => {
    const result = execute(draft(), 'req-success');

    expect(result.ok).toBe(true);
    expect(store.accountById(SOURCE.id)?.balanceMinor).toBe(70_000);
    expect(store.accountById(SOURCE.id)?.availableMinor).toBe(70_000);
    expect(store.accountById(DESTINATION.id)?.balanceMinor).toBe(80_000);
    expect(service.status()).toBe('succeeded');
    expect(service.receipt()?.amountMinor).toBe(30_000);
  });

  it('does nothing until the caller subscribes', () => {
    service.execute(draft(), 'req-lazy');
    vi.advanceTimersByTime(SETTLEMENT_WINDOW_MS);

    expect(store.transfers()).toHaveLength(0);
    expect(store.accountById(SOURCE.id)?.balanceMinor).toBe(100_000);
  });

  it('appends exactly two linked ledger entries and keeps the total balance stable', () => {
    const totalBefore = store.totalBalance().amountMinor;
    execute(draft(), 'req-ledger');

    const transactions = store.transactions();
    expect(transactions).toHaveLength(2);

    const transferId = store.transfers()[0].id;
    expect(transactions.every((transaction) => transaction.transferId === transferId)).toBe(true);
    expect(store.totalBalance().amountMinor).toBe(totalBefore);

    expect(store.accountById(SOURCE.id)?.balanceMinor).toBe(
      SOURCE.balanceMinor + ledgerMovement(transactions, SOURCE.id),
    );
    expect(store.accountById(DESTINATION.id)?.balanceMinor).toBe(
      DESTINATION.balanceMinor + ledgerMovement(transactions, DESTINATION.id),
    );
  });

  it('rejects an insufficient-funds transfer without touching the ledger', () => {
    const result = execute(draft({ amountMinor: 500_000 }), 'req-insufficient');

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors).toContain('INSUFFICIENT_FUNDS');
    }
    expect(store.accountById(SOURCE.id)?.balanceMinor).toBe(100_000);
    expect(store.transactions()).toHaveLength(0);
    expect(store.transfers()).toHaveLength(0);
    expect(service.status()).toBe('failed');
  });

  it('rejects a transfer to the same account', () => {
    const result = execute(draft({ destinationAccountId: SOURCE.id }), 'req-same');

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors).toContain('SAME_ACCOUNT');
    }
    expect(store.transfers()).toHaveLength(0);
  });

  it('is idempotent: repeating a submission does not create a second transfer', () => {
    const first = execute(draft(), 'req-idempotent');
    const second = execute(draft(), 'req-idempotent');

    expect(first.ok && second.ok).toBe(true);
    if (first.ok && second.ok) {
      expect(second.duplicate).toBe(true);
      expect(second.transfer.id).toBe(first.transfer.id);
    }

    expect(store.transfers()).toHaveLength(1);
    expect(store.transactions()).toHaveLength(2);
    expect(store.accountById(SOURCE.id)?.balanceMinor).toBe(70_000);
  });

  it('deduplicates concurrent submissions sharing a request token', () => {
    const emissions: TransferResult[] = [];
    service.execute(draft(), 'req-concurrent').subscribe((result) => emissions.push(result));
    service.execute(draft(), 'req-concurrent').subscribe((result) => emissions.push(result));
    vi.advanceTimersByTime(SETTLEMENT_WINDOW_MS);

    expect(emissions).toHaveLength(2);
    expect(emissions[0]).toBe(emissions[1]);
    expect(store.transfers()).toHaveLength(1);
    expect(store.accountById(SOURCE.id)?.balanceMinor).toBe(70_000);
  });

  it('creates separate transfers for distinct request tokens', () => {
    execute(draft({ amountMinor: 10_000 }), 'req-one');
    execute(draft({ amountMinor: 10_000 }), 'req-two');

    expect(store.transfers()).toHaveLength(2);
    expect(store.accountById(SOURCE.id)?.balanceMinor).toBe(80_000);
  });

  it('validates without executing', () => {
    expect(service.validate(draft())).toEqual({ ok: true });
    expect(service.validate(draft({ amountMinor: 0 })).ok).toBe(false);
    expect(store.transfers()).toHaveLength(0);
  });
});
