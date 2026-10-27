import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { firstValueFrom } from 'rxjs';
import { makeAccount, makeCard, makeSnapshot } from '../../../testing/fixtures';
import { TransferDraft } from '../../domain/models/transfer.model';
import { BankingSnapshot, TransferRejectedError } from '../repositories/banking-data-source';
import { DemoBankingDataSource } from './demo-banking.data-source';
import { DEMO_STATE_KEY, readDemoState } from './demo-storage';

const SOURCE = makeAccount({ id: 'acc-source', balanceMinor: 100_000, availableMinor: 100_000 });
const DESTINATION = makeAccount({
  id: 'acc-destination',
  type: 'savings',
  balanceMinor: 50_000,
  availableMinor: 50_000,
});

const snapshot = (): BankingSnapshot => ({
  ...makeSnapshot([SOURCE, DESTINATION]),
  cards: [makeCard({ id: 'card-a', status: 'active' })],
});

const draft = (overrides: Partial<TransferDraft> = {}): TransferDraft => ({
  sourceAccountId: SOURCE.id,
  destinationAccountId: DESTINATION.id,
  amountMinor: 30_000,
  currency: 'EUR',
  ...overrides,
});

describe('DemoBankingDataSource', () => {
  let adapter: DemoBankingDataSource;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({ providers: [DemoBankingDataSource] });
    adapter = TestBed.inject(DemoBankingDataSource);
    adapter.hydrate(snapshot());
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('identifies itself as the resettable browser-local adapter', () => {
    expect(adapter.mode).toBe('demo');
    expect(adapter.supportsReset).toBe(true);
  });

  it('serves the seeded dataset without any network access', async () => {
    const loaded = await firstValueFrom(adapter.loadSnapshot());

    expect(loaded.accounts).toHaveLength(2);
    expect(loaded.cards).toHaveLength(1);
  });

  it('persists a card status change so a reload continues the demo', async () => {
    const updated = await firstValueFrom(adapter.setCardStatus('card-a', 'frozen'));

    expect(updated.cards[0].status).toBe('frozen');
    expect(readDemoState()?.snapshot.cards[0].status).toBe('frozen');
  });

  it('rejects an unknown card instead of silently succeeding', async () => {
    await expect(firstValueFrom(adapter.setCardStatus('card-missing', 'frozen'))).rejects.toThrow();
  });

  it('books a transfer as two balancing ledger entries', async () => {
    const execution = await firstValueFrom(adapter.executeTransfer(draft(), 'req-1'));

    expect(execution.duplicate).toBe(false);
    expect(execution.snapshot.transactions).toHaveLength(2);
    expect(
      execution.snapshot.transactions.every((entry) => entry.transferId === execution.transfer.id),
    ).toBe(true);

    const total = execution.snapshot.accounts.reduce(
      (sum, account) => sum + account.balanceMinor,
      0,
    );
    expect(total).toBe(SOURCE.balanceMinor + DESTINATION.balanceMinor);
  });

  it('replays a repeated idempotency key instead of transferring twice', async () => {
    const first = await firstValueFrom(adapter.executeTransfer(draft(), 'req-same'));
    const second = await firstValueFrom(adapter.executeTransfer(draft(), 'req-same'));

    expect(second.duplicate).toBe(true);
    expect(second.transfer.id).toBe(first.transfer.id);
    expect(second.snapshot.transfers).toHaveLength(1);
  });

  it('enforces the same business rules the backend enforces', async () => {
    await expect(
      firstValueFrom(adapter.executeTransfer(draft({ amountMinor: 900_000 }), 'req-poor')),
    ).rejects.toBeInstanceOf(TransferRejectedError);
  });

  it('leaves the ledger untouched when a transfer is rejected', async () => {
    await firstValueFrom(
      adapter.executeTransfer(draft({ amountMinor: 900_000 }), 'req-poor'),
    ).catch(() => undefined);

    const loaded = await firstValueFrom(adapter.loadSnapshot());
    expect(loaded.transactions).toHaveLength(0);
    expect(loaded.accounts[0].balanceMinor).toBe(SOURCE.balanceMinor);
  });

  it('restores the seeded dataset and clears stored state on reset', async () => {
    await firstValueFrom(adapter.executeTransfer(draft(), 'req-reset'));
    expect(localStorage.getItem(DEMO_STATE_KEY)).not.toBeNull();

    const restored = await firstValueFrom(adapter.resetDemoData());

    expect(restored.transfers).toHaveLength(0);
    expect(restored.accounts.length).toBeGreaterThan(0);
  });

  it('falls back to a fresh seed when stored state is malformed', () => {
    localStorage.setItem(DEMO_STATE_KEY, '{ not json');
    expect(readDemoState()).toBeNull();
  });
});
