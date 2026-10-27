import { InjectionToken } from '@angular/core';
import { Observable } from 'rxjs';
import { Card, CardId, CardStatus } from '../../domain/models/card.model';
import { Transfer, TransferDraft, TransferErrorCode } from '../../domain/models/transfer.model';
import { LedgerSnapshot } from '../../domain/transfers/transfer-policy';

/** Everything the frontend needs in order to render the whole product. */
export interface BankingSnapshot extends LedgerSnapshot {
  readonly cards: readonly Card[];
}

export interface TransferExecution {
  readonly transfer: Transfer;
  /** The ledger as it stands after the transfer settled. */
  readonly snapshot: BankingSnapshot;
  /** `true` when the idempotency key replayed an already completed transfer. */
  readonly duplicate: boolean;
}

/**
 * Domain-facing data access boundary.
 *
 * The demo adapter and the HTTP adapter both implement it, which is what keeps
 * `if (demoMode)` branching out of components and the store. Exactly one
 * implementation is provided at the application boundary.
 */
export interface BankingDataSource {
  readonly mode: 'demo' | 'api';
  /** `true` only for the browser-local demo, which owns its own state. */
  readonly supportsReset: boolean;

  loadSnapshot(): Observable<BankingSnapshot>;
  setCardStatus(cardId: CardId, status: CardStatus): Observable<BankingSnapshot>;
  executeTransfer(draft: TransferDraft, requestToken: string): Observable<TransferExecution>;
  /** Restores the initial fictional dataset. Demo mode only. */
  resetDemoData(): Observable<BankingSnapshot>;
}

export const BANKING_DATA_SOURCE = new InjectionToken<BankingDataSource>('BANKING_DATA_SOURCE');

/** Stable, language-independent failure reasons surfaced by any adapter. */
export type DataErrorKind =
  'unavailable' | 'not-found' | 'rejected' | 'conflict' | 'unsupported' | 'unknown';

export class DataSourceError extends Error {
  readonly kind: DataErrorKind;
  /** Stable backend/domain code, e.g. `INSUFFICIENT_FUNDS`. */
  readonly code: string;

  constructor(kind: DataErrorKind, code: string, message: string) {
    super(message);
    this.name = 'DataSourceError';
    this.kind = kind;
    this.code = code;
  }
}

/** A transfer that failed one or more business invariants. */
export class TransferRejectedError extends DataSourceError {
  readonly errors: readonly TransferErrorCode[];

  constructor(errors: readonly TransferErrorCode[]) {
    super('rejected', errors[0] ?? 'AMOUNT_REQUIRED', `Transfer rejected: ${errors.join(', ')}`);
    this.name = 'TransferRejectedError';
    this.errors = errors;
  }
}
