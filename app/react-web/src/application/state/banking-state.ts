import type { Account } from '../../domain/models/account.model';
import type { Card } from '../../domain/models/card.model';
import type { Transaction } from '../../domain/models/transaction.model';
import type { Transfer } from '../../domain/models/transfer.model';
import type { BankingSnapshot, DataErrorKind } from '../../data/repositories/banking-data-source';

export type LoadStatus = 'idle' | 'loading' | 'ready' | 'error';

export interface LoadFailure {
  readonly kind: DataErrorKind;
  /** Translation key, resolved by the shell; state itself stays language-free. */
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

export const GENERIC_LOAD_FAILURE: LoadFailure = {
  kind: 'unknown',
  titleKey: 'shell.loadErrorTitle',
  messageKey: 'errors.loadFailed',
};

export const API_UNAVAILABLE_FAILURE: LoadFailure = {
  kind: 'unavailable',
  titleKey: 'errors.apiUnavailableTitle',
  messageKey: 'errors.apiUnavailable',
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

export type BankingAction =
  | { readonly type: 'load/started' }
  | { readonly type: 'load/succeeded'; readonly snapshot: BankingSnapshot }
  | { readonly type: 'load/failed'; readonly failure: LoadFailure }
  | { readonly type: 'snapshot/committed'; readonly snapshot: BankingSnapshot }
  | { readonly type: 'transfer/recorded'; readonly transfer: Transfer }
  | { readonly type: 'balances/toggled' };

const withSnapshot = (state: BankingState, snapshot: BankingSnapshot): BankingState => ({
  ...state,
  accounts: snapshot.accounts,
  cards: snapshot.cards,
  transactions: snapshot.transactions,
  // In API mode the server does not replay historic transfers, so a locally
  // known receipt must not be dropped by a refresh.
  transfers: snapshot.transfers.length > 0 ? snapshot.transfers : state.transfers,
});

/**
 * Canonical ledger state.
 *
 * Only entities live here. Every figure the UI renders is derived from this
 * state by a selector, so no displayed total can drift from the dataset.
 */
export const bankingReducer = (state: BankingState, action: BankingAction): BankingState => {
  switch (action.type) {
    case 'load/started':
      return { ...state, status: 'loading', error: null };

    case 'load/succeeded':
      return { ...withSnapshot(state, action.snapshot), status: 'ready', error: null };

    case 'load/failed':
      return { ...state, status: 'error', error: action.failure };

    case 'snapshot/committed':
      return withSnapshot(state, action.snapshot);

    case 'transfer/recorded':
      return state.transfers.some((transfer) => transfer.id === action.transfer.id)
        ? state
        : { ...state, transfers: [action.transfer, ...state.transfers] };

    case 'balances/toggled':
      return { ...state, balancesHidden: !state.balancesHidden };
  }
};

export const mostRecent = (
  transactions: readonly Transaction[],
  count: number,
): readonly Transaction[] =>
  transactions
    .slice()
    .sort((a, b) => b.bookedAt.localeCompare(a.bookedAt))
    .slice(0, count);
