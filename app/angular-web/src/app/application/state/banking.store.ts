import { computed, inject } from '@angular/core';
import {
  patchState,
  signalStore,
  withComputed,
  withMethods,
  withProps,
  withState,
} from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { EMPTY, Observable, catchError, filter, map, pipe, switchMap, tap } from 'rxjs';
import { BankingRepository } from '../../data/repositories/banking.repository';
import { BankingSnapshot } from '../../data/repositories/banking-data-source';
import { DEMO_CURRENCY, DEMO_HOLDER_NAME } from '../../data/mock/demo-data';
import {
  monthRange,
  monthlySeries,
  periodTotals,
  spendingByCategory,
  totalAvailable,
  totalBalance,
} from '../../domain/analytics/analytics';
import { AccountId } from '../../domain/models/account.model';
import { Card, CardId, toggleCardStatus } from '../../domain/models/card.model';
import { LedgerSnapshot } from '../../domain/transfers/transfer-policy';
import {
  ANALYTICS_MONTHS,
  RECENT_TRANSACTION_COUNT,
  initialBankingState,
  isLoadRedundant,
  loadFailureFor,
  mostRecent,
  withCardStatus,
} from './banking.store.util';

export type { LoadStatus } from './banking.store.util';

/**
 * Single source of truth for the demo ledger.
 *
 * State holds the canonical entities only; every figure the UI renders is a
 * computed projection, so no derived amount can drift from the dataset.
 * Updates are immutable and always go through `patchState`.
 */
export const BankingStore = signalStore(
  { providedIn: 'root' },
  withState(initialBankingState),
  withProps(() => ({
    holderName: DEMO_HOLDER_NAME,
    currency: DEMO_CURRENCY,
  })),
  withComputed(({ accounts, transactions, status, currency }) => ({
    isLoading: computed(() => status() === 'loading'),
    isReady: computed(() => status() === 'ready'),
    totalBalance: computed(() => totalBalance(accounts(), currency)),
    totalAvailable: computed(() => totalAvailable(accounts(), currency)),
    currentMonthTotals: computed(() =>
      periodTotals(transactions(), monthRange(new Date()), currency),
    ),
    currentMonthSpending: computed(() =>
      spendingByCategory(transactions(), monthRange(new Date()), currency),
    ),
    monthlySeries: computed(() =>
      monthlySeries(transactions(), new Date(), currency, ANALYTICS_MONTHS),
    ),
    recentTransactions: computed(() => mostRecent(transactions(), RECENT_TRANSACTION_COUNT)),
    eligibleAccounts: computed(() => accounts().filter((account) => account.status === 'active')),
  })),
  withComputed(({ accounts, transactions, transfers }) => ({
    snapshot: computed<LedgerSnapshot>(() => ({
      accounts: accounts(),
      transactions: transactions(),
      transfers: transfers(),
    })),
  })),
  withMethods((store) => {
    const repository = inject(BankingRepository);

    const applySnapshot = (snapshot: BankingSnapshot): void => {
      patchState(store, {
        accounts: snapshot.accounts,
        cards: snapshot.cards,
        transactions: snapshot.transactions,
        transfers: snapshot.transfers,
        status: 'ready',
        error: null,
      });
    };

    const loadSnapshot = rxMethod<boolean>(
      pipe(
        filter((force) => force || !isLoadRedundant(store.status())),
        tap(() => patchState(store, { status: 'loading', error: null })),
        switchMap(() =>
          repository.loadSnapshot().pipe(
            tap((snapshot) => {
              applySnapshot(snapshot);
            }),
            catchError((error: unknown) => {
              patchState(store, { status: 'error', error: loadFailureFor(error) });
              return EMPTY;
            }),
          ),
        ),
      ),
    );

    return {
      /** Which adapter is active; the shell labels the demo accordingly. */
      mode: (): 'demo' | 'api' => repository.mode,
      supportsReset: (): boolean => repository.supportsReset,

      accountById: (id: AccountId) => store.accounts().find((account) => account.id === id),

      cardsForAccount: (id: AccountId): readonly Card[] =>
        store.cards().filter((card) => card.accountId === id),

      /** Loads the dataset once; re-entrant calls while loading are ignored. */
      load: (force = false): void => {
        loadSnapshot(force);
      },

      /** Replaces the ledger atomically after a domain operation succeeds. */
      commitSnapshot: (snapshot: LedgerSnapshot): void => {
        patchState(store, {
          accounts: snapshot.accounts,
          transactions: snapshot.transactions,
          transfers: snapshot.transfers,
        });
      },

      /** Replaces the whole dataset, including cards, after an adapter write. */
      commitBankingSnapshot: applySnapshot,

      setCardStatus: (cardId: CardId, status: Card['status']): void => {
        patchState(store, { cards: withCardStatus(store.cards(), cardId, status) });
      },

      /**
       * Asks the adapter to flip the card status and adopts the snapshot it
       * returns. There is no optimistic local toggle on purpose: in API mode
       * the server is authoritative.
       */
      toggleCard: (cardId: CardId): Observable<Card> => {
        const current = store.cards().find((card) => card.id === cardId);
        if (current === undefined) {
          return EMPTY;
        }
        const next = toggleCardStatus(current);

        return repository.setCardStatus(cardId, next.status).pipe(
          tap((snapshot) => {
            applySnapshot(snapshot);
          }),
          map((snapshot) => snapshot.cards.find((card) => card.id === cardId) ?? next),
        );
      },

      /** Restores the initial fictional dataset. Demo mode only. */
      resetDemoData: (): Observable<BankingSnapshot> =>
        repository.resetDemoData().pipe(
          tap((snapshot) => {
            applySnapshot(snapshot);
          }),
        ),

      toggleBalanceVisibility: (): void => {
        patchState(store, { balancesHidden: !store.balancesHidden() });
      },

      /** Test seam: load a dataset synchronously without the repository. */
      hydrate: (snapshot: LedgerSnapshot, cards: readonly Card[]): void => {
        patchState(store, {
          accounts: snapshot.accounts,
          transactions: snapshot.transactions,
          transfers: snapshot.transfers,
          cards,
          status: 'ready',
        });
      },
    };
  }),
);

export type BankingStore = InstanceType<typeof BankingStore>;
