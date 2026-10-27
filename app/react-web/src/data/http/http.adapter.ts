import type { CardId, CardStatus } from '../../domain/models/card.model';
import type { TransferDraft } from '../../domain/models/transfer.model';
import {
  type BankingDataSource,
  type BankingSnapshot,
  DataSourceError,
  type TransferExecution,
} from '../repositories/banking-data-source';
import { toAccount, toCard, toTransaction, toTransfer } from './dto-mapper';
import type {
  AccountDto,
  CardDto,
  CreateTransferRequestDto,
  TransactionPageDto,
  TransferDto,
  UpdateCardStatusRequestDto,
} from './dto';
import { HttpClient } from './http-client';

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
export class HttpBankingDataSource implements BankingDataSource {
  readonly mode = 'api' as const;
  readonly supportsReset = false;

  private readonly http: HttpClient;

  constructor(baseUrl: string) {
    this.http = new HttpClient(baseUrl);
  }

  async loadSnapshot(): Promise<BankingSnapshot> {
    const [accounts, cards, transactions] = await Promise.all([
      this.http.request<readonly AccountDto[]>('/accounts'),
      this.http.request<readonly CardDto[]>('/cards'),
      this.http.request<TransactionPageDto>(`/transactions?size=${TRANSACTION_PAGE_SIZE}`),
    ]);

    return {
      accounts: accounts.data.map(toAccount),
      cards: cards.data.map(toCard),
      transactions: transactions.data.items.map(toTransaction),
      // Transfers are reconstructed from their ledger entries on demand; the
      // receipt of the transfer just executed is kept by the use case.
      transfers: [],
    };
  }

  async setCardStatus(cardId: CardId, status: CardStatus): Promise<BankingSnapshot> {
    const body: UpdateCardStatusRequestDto = { status };
    await this.http.request<CardDto>(`/cards/${encodeURIComponent(cardId)}/status`, {
      method: 'PATCH',
      body,
    });
    return this.loadSnapshot();
  }

  async executeTransfer(draft: TransferDraft, requestToken: string): Promise<TransferExecution> {
    const { sourceAccountId, destinationAccountId, amountMinor } = draft;

    if (sourceAccountId === null || destinationAccountId === null || amountMinor === null) {
      // The review step cannot be reached with an incomplete draft; this guard
      // only narrows the types at the transport boundary.
      throw new DataSourceError(
        'rejected',
        'VALIDATION_FAILED',
        'The transfer draft is incomplete.',
      );
    }

    const reference = draft.reference?.trim();
    const body: CreateTransferRequestDto = {
      sourceAccountId,
      destinationAccountId,
      amount: { amountMinor, currency: draft.currency },
      ...(reference === undefined || reference === '' ? {} : { reference }),
    };

    const response = await this.http.request<TransferDto>('/transfers', {
      method: 'POST',
      body,
      headers: { [IDEMPOTENCY_HEADER]: requestToken },
    });

    const snapshot = await this.loadSnapshot();

    return {
      transfer: toTransfer(response.data, requestToken),
      snapshot,
      duplicate: response.headers.get(REPLAYED_HEADER) === 'true',
    };
  }

  resetDemoData(): Promise<BankingSnapshot> {
    // Resetting is a property of the browser-local demo, not of shared server
    // state. Failing loudly is better than silently doing nothing.
    return Promise.reject(
      new DataSourceError(
        'unsupported',
        'RESET_UNSUPPORTED',
        'Demo data cannot be reset while the application is connected to the API.',
      ),
    );
  }

  /** Used by the connection banner to distinguish "down" from "misconfigured". */
  async checkHealth(): Promise<boolean> {
    try {
      await this.http.request<unknown>('/health');
      return true;
    } catch {
      return false;
    }
  }
}
