import { Injectable, Signal, computed, inject, signal } from '@angular/core';
import { Observable, catchError, map, of, shareReplay, tap, throwError } from 'rxjs';
import { BankingStore } from '../state/banking.store';
import { BankingRepository } from '../../data/repositories/banking.repository';
import {
  DataSourceError,
  TransferExecution,
  TransferRejectedError,
} from '../../data/repositories/banking-data-source';
import {
  Transfer,
  TransferDraft,
  TransferErrorCode,
  TransferValidation,
} from '../../domain/models/transfer.model';
import { validateTransfer } from '../../domain/transfers/transfer-policy';

export type TransferResult =
  | { readonly ok: true; readonly transfer: Transfer; readonly duplicate: boolean }
  | { readonly ok: false; readonly errors: readonly TransferErrorCode[] };

export type TransferStatus = 'idle' | 'submitting' | 'succeeded' | 'failed';

/** Shown when the failure was a connection problem rather than a business rule. */
export const TRANSFER_UNAVAILABLE_CODE = 'API_UNAVAILABLE';

/**
 * Internal transfer use case.
 *
 * All business rules live in the pure domain policy and are re-enforced by the
 * active adapter — locally in demo mode, by the backend in API mode. This
 * service only owns orchestration: idempotency, submission status and adopting
 * the resulting snapshot. Components never compute balances themselves.
 */
@Injectable({ providedIn: 'root' })
export class TransferService {
  private readonly store = inject(BankingStore);
  private readonly repository = inject(BankingRepository);

  /** Completed transfers keyed by idempotency token. */
  private readonly processed = new Map<string, Transfer>();
  /** In-flight submissions keyed by idempotency token. */
  private readonly inFlight = new Map<string, Observable<TransferResult>>();

  private readonly statusState = signal<TransferStatus>('idle');
  private readonly errorsState = signal<readonly string[]>([]);
  private readonly receiptState = signal<Transfer | null>(null);

  readonly status: Signal<TransferStatus> = this.statusState.asReadonly();
  readonly errors: Signal<readonly string[]> = this.errorsState.asReadonly();
  readonly receipt: Signal<Transfer | null> = this.receiptState.asReadonly();
  readonly isSubmitting = computed(() => this.statusState() === 'submitting');

  /** Pure pre-flight check used by the form and the review step. */
  validate(draft: TransferDraft): TransferValidation {
    return validateTransfer(draft, this.store.accounts());
  }

  /**
   * Executes a transfer exactly once per request token. Repeated submissions
   * with the same token replay the original result without creating new ledger
   * entries or touching balances again.
   */
  execute(draft: TransferDraft, requestToken: string): Observable<TransferResult> {
    const alreadyProcessed = this.processed.get(requestToken);
    if (alreadyProcessed !== undefined) {
      this.markSucceeded(alreadyProcessed);
      return of({ ok: true, transfer: alreadyProcessed, duplicate: true });
    }

    const pending = this.inFlight.get(requestToken);
    if (pending !== undefined) {
      return pending;
    }

    this.statusState.set('submitting');
    this.errorsState.set([]);
    this.receiptState.set(null);

    const run = this.repository.executeTransfer(draft, requestToken).pipe(
      map((execution) => this.settle(execution, requestToken)),
      catchError((error: unknown) => {
        this.inFlight.delete(requestToken);
        return this.reject(error);
      }),
      tap(() => this.inFlight.delete(requestToken)),
      // One subscription drives the settlement; later subscribers replay it.
      shareReplay({ bufferSize: 1, refCount: false }),
    );

    this.inFlight.set(requestToken, run);
    return run;
  }

  reset(): void {
    this.statusState.set('idle');
    this.errorsState.set([]);
    this.receiptState.set(null);
  }

  private settle(execution: TransferExecution, requestToken: string): TransferResult {
    this.store.commitBankingSnapshot(execution.snapshot);
    this.processed.set(requestToken, execution.transfer);
    this.markSucceeded(execution.transfer);

    return { ok: true, transfer: execution.transfer, duplicate: execution.duplicate };
  }

  /**
   * Business rejections surface their stable codes so the form can highlight
   * the offending field. Anything else — most importantly a connection failure
   * — is reported as such; demo data never stands in for a failed API call.
   */
  private reject(error: unknown): Observable<TransferResult> {
    if (error instanceof TransferRejectedError) {
      this.markFailed(error.errors);
      return of({ ok: false, errors: error.errors });
    }

    if (error instanceof DataSourceError) {
      this.markFailed([error.kind === 'unavailable' ? TRANSFER_UNAVAILABLE_CODE : error.code]);
      return of({ ok: false, errors: [] });
    }

    return throwError(() => error);
  }

  private markFailed(codes: readonly string[]): void {
    this.statusState.set('failed');
    this.errorsState.set(codes);
  }

  private markSucceeded(transfer: Transfer): void {
    this.statusState.set('succeeded');
    this.errorsState.set([]);
    this.receiptState.set(transfer);
  }
}
