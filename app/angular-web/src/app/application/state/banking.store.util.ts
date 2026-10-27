import { Account } from '../../domain/models/account.model';
import { Card, CardId } from '../../domain/models/card.model';
import { Transaction } from '../../domain/models/transaction.model';
import { Transfer } from '../../domain/models/transfer.model';
import { DataSourceError } from '../../data/repositories/banking-data-source';

export type LoadStatus = 'idle' | 'loading' | 'ready' | 'error';

/**
 * A load failure reduced to translation keys.
 *
 * The store stays language-free; the shell resolves the keys. Keeping the
 * title alongside the message lets an unreachable backend be named explicitly
 * instead of hiding behind a generic error heading.
 */
export interface LoadFailure {
  readonly titleKey: string;
  readonly messageKey: string;
}

export interface BankingState {
  readonly accounts: readonly Account[];
  readonly cards: readonly Card[];
  readonly transactions: readonly Transaction[];
  readonly transfers: readonly Transfer[];
  readonly status: LoadStatus;
  readonly error: LoadFailure | null;
  readonly balancesHidden: boolean;
}

export const RECENT_TRANSACTION_COUNT = 6;
export const ANALYTICS_MONTHS = 6;
/** Translation key, resolved by the shell; the store itself stays language-free. */
export const LOAD_ERROR_KEY = 'errors.loadFailed';

export const LOAD_FAILURE: LoadFailure = {
  titleKey: 'shell.loadErrorTitle',
  messageKey: LOAD_ERROR_KEY,
};

export const initialBankingState: BankingState = {
  accounts: [],
  cards: [],
  transactions: [],
  transfers: [],
  status: 'idle',
  error: null,
  balancesHidden: false,
};

/** A load is redundant once the dataset is in flight or already in memory. */
export const isLoadRedundant = (status: LoadStatus): boolean =>
  status === 'loading' || status === 'ready';

/** Translation key for a backend that cannot be reached at all. */
export const API_UNAVAILABLE_KEY = 'errors.apiUnavailable';

export const API_UNAVAILABLE_FAILURE: LoadFailure = {
  titleKey: 'errors.apiUnavailableTitle',
  messageKey: API_UNAVAILABLE_KEY,
};

/**
 * Maps a data-access failure to translation keys.
 *
 * A connection problem is reported as exactly that: the application never
 * substitutes demo data for a failed API call, because that would make a
 * server-side failure look like a success.
 */
export const loadFailureFor = (error: unknown): LoadFailure =>
  error instanceof DataSourceError && error.kind === 'unavailable'
    ? API_UNAVAILABLE_FAILURE
    : LOAD_FAILURE;

export const mostRecent = (
  transactions: readonly Transaction[],
  count: number,
): readonly Transaction[] =>
  transactions
    .slice()
    .sort((a, b) => b.bookedAt.localeCompare(a.bookedAt))
    .slice(0, count);

export const replaceCard = (cards: readonly Card[], updated: Card): readonly Card[] =>
  cards.map((card) => (card.id === updated.id ? updated : card));

export const withCardStatus = (
  cards: readonly Card[],
  cardId: CardId,
  status: Card['status'],
): readonly Card[] => cards.map((card) => (card.id === cardId ? { ...card, status } : card));
