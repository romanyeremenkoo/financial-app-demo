import { HttpClient, HttpErrorResponse, HttpHeaders, HttpResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, forkJoin, throwError } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';
import { CardId, CardStatus } from '../../domain/models/card.model';
import { TransferDraft } from '../../domain/models/transfer.model';
import { environment } from '../../../environments/environment';
import {
  BankingDataSource,
  BankingSnapshot,
  DataSourceError,
  TransferExecution,
} from '../repositories/banking-data-source';
import {
  AccountDto,
  CardDto,
  CreateTransferRequestDto,
  TransactionPageDto,
  TransferDto,
  UpdateCardStatusRequestDto,
} from './dto';
import { toAccount, toCard, toTransaction, toTransfer } from './dto-mapper';
import { toDataSourceError } from './http-error.mapper';

/** One page large enough to hold the full demo history used by analytics. */
const TRANSACTION_PAGE_SIZE = 500;

const IDEMPOTENCY_HEADER = 'Idempotency-Key';
const REPLAYED_HEADER = 'Idempotency-Replayed';

/**
 * Shared Spring Boot API implementation of the banking data source.
 *
 * The server is authoritative in this mode: after any write the snapshot is
 * re-read so the UI can never display a locally guessed balance.
 */
@Injectable({ providedIn: 'root' })
export class HttpBankingDataSource implements BankingDataSource {
  private readonly http = inject(HttpClient);

  readonly mode = 'api' as const;
  readonly supportsReset = false;

  private readonly baseUrl = environment.apiBaseUrl;

  loadSnapshot(): Observable<BankingSnapshot> {
    return forkJoin({
      accounts: this.get<AccountDto[]>('/accounts'),
      cards: this.get<CardDto[]>('/cards'),
      transactions: this.get<TransactionPageDto>(`/transactions?size=${TRANSACTION_PAGE_SIZE}`),
    }).pipe(
      map(({ accounts, cards, transactions }) => ({
        accounts: accounts.map(toAccount),
        cards: cards.map(toCard),
        transactions: transactions.items.map(toTransaction),
        // Transfers are reconstructed from their ledger entries on demand; the
        // receipt of the transfer just executed is kept by the use case.
        transfers: [],
      })),
    );
  }

  setCardStatus(cardId: CardId, status: CardStatus): Observable<BankingSnapshot> {
    const body: UpdateCardStatusRequestDto = { status };
    return this.http
      .patch<CardDto>(`${this.baseUrl}/cards/${encodeURIComponent(cardId)}/status`, body)
      .pipe(
        catchError((error: HttpErrorResponse) => this.fail(error)),
        switchMap(() => this.loadSnapshot()),
      );
  }

  executeTransfer(draft: TransferDraft, requestToken: string): Observable<TransferExecution> {
    const { sourceAccountId, destinationAccountId, amountMinor } = draft;

    if (sourceAccountId === null || destinationAccountId === null || amountMinor === null) {
      // The review step cannot be reached with an incomplete draft; this guard
      // only narrows the types at the transport boundary.
      return throwError(
        () =>
          new DataSourceError('rejected', 'VALIDATION_FAILED', 'The transfer draft is incomplete.'),
      );
    }

    const reference = draft.reference?.trim();
    const body: CreateTransferRequestDto = {
      sourceAccountId,
      destinationAccountId,
      amount: { amountMinor, currency: draft.currency },
      ...(reference === undefined || reference === '' ? {} : { reference }),
    };

    return this.http
      .post<TransferDto>(`${this.baseUrl}/transfers`, body, {
        observe: 'response',
        headers: new HttpHeaders({ [IDEMPOTENCY_HEADER]: requestToken }),
      })
      .pipe(
        catchError((error: HttpErrorResponse) => this.fail(error)),
        switchMap((response: HttpResponse<TransferDto>) =>
          this.loadSnapshot().pipe(
            map((snapshot) => ({
              transfer: toTransfer(response.body as TransferDto, requestToken),
              snapshot,
              duplicate: response.headers.get(REPLAYED_HEADER) === 'true',
            })),
          ),
        ),
      );
  }

  resetDemoData(): Observable<BankingSnapshot> {
    // Resetting is a property of the browser-local demo, not of shared server
    // state. Failing loudly is better than silently doing nothing.
    return throwError(
      () =>
        new DataSourceError(
          'unsupported',
          'RESET_UNSUPPORTED',
          'Demo data cannot be reset while the application is connected to the API.',
        ),
    );
  }

  private get<T>(path: string): Observable<T> {
    return this.http
      .get<T>(`${this.baseUrl}${path}`)
      .pipe(catchError((error: HttpErrorResponse) => this.fail(error)));
  }

  private fail(error: HttpErrorResponse): Observable<never> {
    return throwError(() => toDataSourceError(error, this.baseUrl));
  }
}
