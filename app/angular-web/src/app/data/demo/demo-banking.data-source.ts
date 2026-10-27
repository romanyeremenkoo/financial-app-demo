import { Injectable } from '@angular/core';
import { Observable, defer, of, shareReplay, throwError } from 'rxjs';
import { delay, map, tap } from 'rxjs/operators';
import { CardId, CardStatus } from '../../domain/models/card.model';
import { Transfer, TransferDraft } from '../../domain/models/transfer.model';
import { applyTransfer } from '../../domain/transfers/transfer-policy';
import { createId } from '../../shared/util/id.util';
import { buildDemoDataSet } from '../mock/demo-data';
import {
  BankingDataSource,
  BankingSnapshot,
  DataSourceError,
  TransferExecution,
  TransferRejectedError,
} from '../repositories/banking-data-source';
import { DemoState, clearDemoState, readDemoState, writeDemoState } from './demo-storage';

/** Simulated network latency so loading states are real, not decorative. */
const SIMULATED_LATENCY_MS = 450;

/** Simulated settlement latency, long enough to exercise the pending UI. */
const SETTLEMENT_LATENCY_MS = 650;

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
 * It owns the demo ledger end to end: the deterministic seed dataset, the same
 * business rules the backend enforces, and `localStorage` persistence so a
 * reload continues the demo. No network request is ever made, which is what
 * makes the public deployment independent of the API.
 */
@Injectable({ providedIn: 'root' })
export class DemoBankingDataSource implements BankingDataSource {
  readonly mode = 'demo' as const;
  readonly supportsReset = true;

  private state: DemoState;
  /** Receipts keyed by request token, so a replay returns the original result. */
  private readonly receipts = new Map<string, Transfer>();
  /** In-flight settlements keyed by request token, to absorb double submits. */
  private readonly inFlight = new Map<string, Observable<TransferExecution>>();

  constructor() {
    this.state = readDemoState() ?? seedState();
    this.indexExistingTransfers();
  }

  loadSnapshot(): Observable<BankingSnapshot> {
    return defer(() => of(this.state.snapshot)).pipe(delay(SIMULATED_LATENCY_MS));
  }

  setCardStatus(cardId: CardId, status: CardStatus): Observable<BankingSnapshot> {
    return defer(() => {
      const card = this.state.snapshot.cards.find((entry) => entry.id === cardId);
      if (card === undefined) {
        return throwError(
          () => new DataSourceError('not-found', 'CARD_NOT_FOUND', `Unknown card: ${cardId}`),
        );
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

      return of(this.state.snapshot);
    }).pipe(delay(SIMULATED_LATENCY_MS));
  }

  executeTransfer(draft: TransferDraft, requestToken: string): Observable<TransferExecution> {
    const replayed = this.receipts.get(requestToken);
    if (replayed !== undefined) {
      return of({ transfer: replayed, snapshot: this.state.snapshot, duplicate: true });
    }

    // A second submit of the same token joins the first settlement instead of
    // starting a competing one.
    const pending = this.inFlight.get(requestToken);
    if (pending !== undefined) {
      return pending;
    }

    const settlement = of(null).pipe(
      delay(SETTLEMENT_LATENCY_MS),
      map(() => this.settle(draft, requestToken)),
      tap({
        next: () => this.inFlight.delete(requestToken),
        error: () => this.inFlight.delete(requestToken),
      }),
      // One subscription drives the settlement; later subscribers replay it.
      shareReplay({ bufferSize: 1, refCount: false }),
    );

    this.inFlight.set(requestToken, settlement);
    return settlement;
  }

  resetDemoData(): Observable<BankingSnapshot> {
    return defer(() => {
      clearDemoState();
      this.receipts.clear();
      this.inFlight.clear();
      this.state = seedState();
      writeDemoState(this.state);
      return of(this.state.snapshot);
    }).pipe(delay(SIMULATED_LATENCY_MS));
  }

  /**
   * Test seam: replaces the demo ledger in memory without persisting it, so a
   * spec can start from a dataset it fully controls.
   */
  hydrate(snapshot: BankingSnapshot): void {
    this.state = { snapshot, processedTokens: [] };
    this.receipts.clear();
    this.inFlight.clear();
  }

  private settle(draft: TransferDraft, requestToken: string): TransferExecution {
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
