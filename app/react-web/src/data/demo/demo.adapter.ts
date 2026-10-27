import type { CardId, CardStatus } from '../../domain/models/card.model';
import type { Transfer, TransferDraft } from '../../domain/models/transfer.model';
import { applyTransfer } from '../../domain/transfers/transfer-policy';
import { createId } from '../../shared/util/id.util';
import {
  type BankingDataSource,
  type BankingSnapshot,
  DataSourceError,
  type TransferExecution,
  TransferRejectedError,
} from '../repositories/banking-data-source';
import { buildDemoDataSet } from './demo-data';
import { type DemoState, clearDemoState, readDemoState, writeDemoState } from './demo-storage';

/** Simulated network latency so loading states are real, not decorative. */
const SIMULATED_LATENCY_MS = 450;

/** Simulated settlement latency, long enough to exercise the pending UI. */
const SETTLEMENT_LATENCY_MS = 650;

const delay = (ms: number): Promise<void> =>
  new Promise((resolve) => {
    globalThis.setTimeout(resolve, ms);
  });

const seedState = (): DemoState => {
  const { accounts, cards, transactions } = buildDemoDataSet();
  return {
    snapshot: { accounts, cards, transactions, transfers: [] },
    processedTokens: [],
  };
};

/**
 * Browser-local implementation of the banking data source.
 *
 * It owns the demo ledger end to end: the deterministic seed dataset, the
 * same business rules the backend enforces, and `localStorage` persistence so
 * a reload continues the demo. No network request is ever made, which is what
 * makes the public deployment independent of the API.
 */
export class DemoBankingDataSource implements BankingDataSource {
  readonly mode = 'demo' as const;
  readonly supportsReset = true;

  private state: DemoState;
  /** Receipts keyed by request token, so a replay returns the original result. */
  private readonly receipts = new Map<string, Transfer>();
  /** In-flight settlements keyed by request token, to reject double submits. */
  private readonly inFlight = new Map<string, Promise<TransferExecution>>();

  constructor(private readonly latencyMs: number = SIMULATED_LATENCY_MS) {
    this.state = readDemoState() ?? seedState();
    this.indexExistingTransfers();
  }

  async loadSnapshot(): Promise<BankingSnapshot> {
    await delay(this.latencyMs);
    return this.state.snapshot;
  }

  async setCardStatus(cardId: CardId, status: CardStatus): Promise<BankingSnapshot> {
    await delay(this.latencyMs);

    const card = this.state.snapshot.cards.find((entry) => entry.id === cardId);
    if (card === undefined) {
      throw new DataSourceError('not-found', 'CARD_NOT_FOUND', `Unknown card: ${cardId}`);
    }

    this.commit({
      ...this.state,
      snapshot: {
        ...this.state.snapshot,
        cards: this.state.snapshot.cards.map((entry) =>
          entry.id === cardId ? { ...entry, status } : entry,
        ),
      },
    });

    return this.state.snapshot;
  }

  executeTransfer(draft: TransferDraft, requestToken: string): Promise<TransferExecution> {
    const replayed = this.receipts.get(requestToken);
    if (replayed !== undefined) {
      return Promise.resolve({
        transfer: replayed,
        snapshot: this.state.snapshot,
        duplicate: true,
      });
    }

    // A second submit of the same token joins the first settlement instead of
    // starting a competing one.
    const pending = this.inFlight.get(requestToken);
    if (pending !== undefined) {
      return pending;
    }

    const settlement = this.settle(draft, requestToken).finally(() => {
      this.inFlight.delete(requestToken);
    });

    this.inFlight.set(requestToken, settlement);
    return settlement;
  }

  async resetDemoData(): Promise<BankingSnapshot> {
    clearDemoState();
    this.receipts.clear();
    this.inFlight.clear();
    this.state = seedState();
    writeDemoState(this.state);
    await delay(this.latencyMs);
    return this.state.snapshot;
  }

  private async settle(draft: TransferDraft, requestToken: string): Promise<TransferExecution> {
    await delay(SETTLEMENT_LATENCY_MS);

    const outcome = applyTransfer(this.state.snapshot, draft, {
      transferId: createId('trf'),
      debitTransactionId: createId('txn'),
      creditTransactionId: createId('txn'),
      requestToken,
      bookedAt: new Date().toISOString(),
    });

    if (!outcome.ok) {
      throw new TransferRejectedError(outcome.errors);
    }

    this.commit({
      snapshot: { ...outcome.snapshot, cards: this.state.snapshot.cards },
      processedTokens: [...this.state.processedTokens, requestToken],
    });
    this.receipts.set(requestToken, outcome.transfer);

    return { transfer: outcome.transfer, snapshot: this.state.snapshot, duplicate: false };
  }

  private commit(next: DemoState): void {
    this.state = next;
    writeDemoState(next);
  }

  /** Rebuilds the replay index after state was restored from storage. */
  private indexExistingTransfers(): void {
    for (const transfer of this.state.snapshot.transfers) {
      this.receipts.set(transfer.requestToken, transfer);
    }
  }
}
