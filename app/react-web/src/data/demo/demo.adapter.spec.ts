import { beforeEach, describe, expect, it } from 'vitest';
import { TransferRejectedError } from '../repositories/banking-data-source';
import type { TransferDraft } from '../../domain/models/transfer.model';
import { DemoBankingDataSource } from './demo.adapter';

/** Zero latency keeps the suite fast; the production default is deliberate. */
const adapter = () => new DemoBankingDataSource(0);

const draftFor = async (
  source: DemoBankingDataSource,
  overrides: Partial<TransferDraft> = {},
): Promise<TransferDraft> => {
  const snapshot = await source.loadSnapshot();
  const [from, to] = snapshot.accounts;
  if (from === undefined || to === undefined) {
    throw new Error('demo seed must contain at least two accounts');
  }
  return {
    sourceAccountId: from.id,
    destinationAccountId: to.id,
    amountMinor: 2500,
    currency: 'EUR',
    ...overrides,
  };
};

describe('DemoBankingDataSource', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('is a demo adapter that supports resetting', () => {
    const source = adapter();
    expect(source.mode).toBe('demo');
    expect(source.supportsReset).toBe(true);
  });

  it('loads a deterministic seed dataset', async () => {
    const first = await adapter().loadSnapshot();
    const second = await adapter().loadSnapshot();

    expect(first.accounts.length).toBeGreaterThanOrEqual(2);
    expect(first.cards.length).toBeGreaterThanOrEqual(2);
    expect(first.transactions.length).toBeGreaterThan(0);
    expect(second.accounts).toEqual(first.accounts);
    expect(second.transactions.map((t) => t.id)).toEqual(first.transactions.map((t) => t.id));
  });

  it('persists card changes across adapter instances', async () => {
    const source = adapter();
    const snapshot = await source.loadSnapshot();
    const card = snapshot.cards[0];
    if (card === undefined) {
      throw new Error('demo seed must contain a card');
    }

    await source.setCardStatus(card.id, 'frozen');

    const restored = await adapter().loadSnapshot();
    expect(restored.cards.find((entry) => entry.id === card.id)?.status).toBe('frozen');
  });

  it('rejects an unknown card', async () => {
    await expect(adapter().setCardStatus('card-nope', 'frozen')).rejects.toMatchObject({
      code: 'CARD_NOT_FOUND',
    });
  });

  it('settles a transfer with two balancing ledger entries', async () => {
    const source = adapter();
    const draft = await draftFor(source);
    const before = await source.loadSnapshot();

    const execution = await source.executeTransfer(draft, 'req-1');

    expect(execution.duplicate).toBe(false);
    const legs = execution.snapshot.transactions.filter(
      (txn) => txn.transferId === execution.transfer.id,
    );
    expect(legs).toHaveLength(2);

    const sourceBefore = before.accounts.find((a) => a.id === draft.sourceAccountId);
    const sourceAfter = execution.snapshot.accounts.find((a) => a.id === draft.sourceAccountId);
    expect(sourceAfter?.balanceMinor).toBe((sourceBefore?.balanceMinor ?? 0) - 2500);
  });

  it('replays the same receipt for a repeated request token', async () => {
    const source = adapter();
    const draft = await draftFor(source);

    const first = await source.executeTransfer(draft, 'req-dup');
    const second = await source.executeTransfer(draft, 'req-dup');

    expect(second.duplicate).toBe(true);
    expect(second.transfer.id).toBe(first.transfer.id);
    expect(second.snapshot.transfers.filter((t) => t.requestToken === 'req-dup')).toHaveLength(1);
  });

  it('joins a concurrent submission of the same token instead of settling twice', async () => {
    const source = adapter();
    const draft = await draftFor(source);

    const [a, b] = await Promise.all([
      source.executeTransfer(draft, 'req-race'),
      source.executeTransfer(draft, 'req-race'),
    ]);

    expect(b.transfer.id).toBe(a.transfer.id);
    const snapshot = await source.loadSnapshot();
    expect(snapshot.transfers).toHaveLength(1);
  });

  it('rejects an invalid transfer without touching balances', async () => {
    const source = adapter();
    const before = await source.loadSnapshot();
    const draft = await draftFor(source, { amountMinor: 9_999_999_99 });

    await expect(source.executeTransfer(draft, 'req-bad')).rejects.toBeInstanceOf(
      TransferRejectedError,
    );

    const after = await source.loadSnapshot();
    expect(after.accounts).toEqual(before.accounts);
    expect(after.transfers).toHaveLength(0);
  });

  it('restores the initial dataset on reset', async () => {
    const source = adapter();
    const draft = await draftFor(source);
    await source.executeTransfer(draft, 'req-reset');

    const restored = await source.resetDemoData();

    expect(restored.transfers).toHaveLength(0);
    const seeded = await adapter().loadSnapshot();
    expect(restored.accounts).toEqual(seeded.accounts);
  });

  it('falls back to the seed when stored state is malformed', async () => {
    localStorage.setItem('financial-app.demo-state', '{ not json');
    const snapshot = await adapter().loadSnapshot();
    expect(snapshot.accounts.length).toBeGreaterThan(0);
  });
});
