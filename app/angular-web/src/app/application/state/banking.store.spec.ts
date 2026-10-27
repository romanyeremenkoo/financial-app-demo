import { SpectatorService, createServiceFactory } from '@ngneat/spectator/vitest';
import { describe, expect, it } from 'vitest';
import { Observable, Subject, of, throwError } from 'rxjs';
import { makeAccount, makeCard, makeSnapshot, makeTransaction } from '../../../testing/fixtures';
import { Card, CardId, CardStatus } from '../../domain/models/card.model';
import { BankingRepository } from '../../data/repositories/banking.repository';
import { BankingSnapshot, DataSourceError } from '../../data/repositories/banking-data-source';
import { BankingStore } from './banking.store';
import { API_UNAVAILABLE_KEY, LOAD_ERROR_KEY } from './banking.store.util';

const emptySnapshot = (): BankingSnapshot => ({
  accounts: [],
  cards: [],
  transactions: [],
  transfers: [],
});

/**
 * The store sits on top of the data-access boundary, so every suite below
 * provides a stub adapter rather than reaching for a real one.
 */
const stubRepository = (
  overrides: Partial<BankingRepository> = {},
): Partial<BankingRepository> => ({
  mode: 'demo',
  supportsReset: true,
  loadSnapshot: () => of(emptySnapshot()),
  setCardStatus: () => of(emptySnapshot()),
  resetDemoData: () => of(emptySnapshot()),
  ...overrides,
});

describe('BankingStore', () => {
  let spectator: SpectatorService<BankingStore>;
  let store: BankingStore;

  /** Card writes go through the adapter, which answers with the next snapshot. */
  const cardWriter = (): Partial<BankingRepository> =>
    stubRepository({
      setCardStatus: (cardId: CardId, status: CardStatus): Observable<BankingSnapshot> =>
        of({
          accounts: store.accounts(),
          transactions: store.transactions(),
          transfers: store.transfers(),
          cards: store.cards().map((card) => (card.id === cardId ? { ...card, status } : card)),
        }),
    });

  const createService = createServiceFactory({
    service: BankingStore,
    providers: [{ provide: BankingRepository, useFactory: cardWriter }],
  });

  const hydrateCards = (): void =>
    store.hydrate(makeSnapshot([makeAccount()]), [
      makeCard({ id: 'card-active', status: 'active' }),
      makeCard({ id: 'card-frozen', status: 'frozen' }),
    ]);

  const cardStatus = (id: string): string | undefined =>
    store.cards().find((card) => card.id === id)?.status;

  /** Subscribes and returns the single emitted card, or `undefined` if none. */
  const toggle = (id: string): Card | undefined => {
    let result: Card | undefined;
    store.toggleCard(id).subscribe((card) => {
      result = card;
    });
    return result;
  };

  beforeEach(() => {
    spectator = createService();
    store = spectator.service;
  });

  describe('card freeze and unfreeze', () => {
    beforeEach(hydrateCards);

    it('freezes an active card and leaves the others untouched', () => {
      expect(toggle('card-active')?.status).toBe('frozen');
      expect(cardStatus('card-active')).toBe('frozen');
      expect(cardStatus('card-frozen')).toBe('frozen');
    });

    it('unfreezes a frozen card', () => {
      expect(toggle('card-frozen')?.status).toBe('active');
      expect(cardStatus('card-frozen')).toBe('active');
    });

    it('round-trips back to the original status', () => {
      toggle('card-active');
      toggle('card-active');
      expect(cardStatus('card-active')).toBe('active');
    });

    it('replaces the card list immutably', () => {
      const before = store.cards();
      toggle('card-active');

      expect(store.cards()).not.toBe(before);
      expect(before.find((card) => card.id === 'card-active')?.status).toBe('active');
    });

    it('reports an unknown card instead of silently succeeding', () => {
      expect(toggle('card-missing')).toBeUndefined();
    });

    it('sets an explicit status', () => {
      store.setCardStatus('card-active', 'frozen');
      expect(cardStatus('card-active')).toBe('frozen');
    });

    it('lists the cards attached to an account', () => {
      expect(store.cardsForAccount('acc-a')).toHaveLength(2);
      expect(store.cardsForAccount('acc-other')).toHaveLength(0);
    });
  });

  describe('derived figures', () => {
    it('derives totals and recent activity from the same dataset', () => {
      const now = new Date();
      const bookedAt = new Date(
        Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 2, 9),
      ).toISOString();

      store.hydrate(
        makeSnapshot(
          [
            makeAccount({ id: 'acc-a', balanceMinor: 120_000, availableMinor: 110_000 }),
            makeAccount({ id: 'acc-b', balanceMinor: 80_000, availableMinor: 80_000 }),
          ],
          [
            makeTransaction({
              id: 'income',
              direction: 'credit',
              category: 'income',
              amountMinor: 300_000,
              bookedAt,
            }),
            makeTransaction({ id: 'spend', category: 'groceries', amountMinor: 25_000, bookedAt }),
          ],
        ),
        [],
      );

      expect(store.totalBalance().amountMinor).toBe(200_000);
      expect(store.totalAvailable().amountMinor).toBe(190_000);
      expect(store.currentMonthTotals().income.amountMinor).toBe(300_000);
      expect(store.currentMonthTotals().expenses.amountMinor).toBe(25_000);
      expect(store.currentMonthTotals().net.amountMinor).toBe(275_000);
      expect(store.currentMonthSpending()[0]).toMatchObject({ category: 'groceries', share: 100 });
      expect(store.recentTransactions().map((transaction) => transaction.id)).toEqual([
        'income',
        'spend',
      ]);
    });

    it('toggles balance visibility', () => {
      expect(store.balancesHidden()).toBe(false);

      store.toggleBalanceVisibility();
      expect(store.balancesHidden()).toBe(true);

      store.toggleBalanceVisibility();
      expect(store.balancesHidden()).toBe(false);
    });

    it('exposes only eligible accounts for transfers', () => {
      store.hydrate(
        makeSnapshot([
          makeAccount({ id: 'acc-a' }),
          makeAccount({ id: 'acc-closed', status: 'closed' }),
        ]),
        [],
      );

      expect(store.eligibleAccounts().map((account) => account.id)).toEqual(['acc-a']);
    });
  });
});

describe('loading the dataset', () => {
  const snapshot: BankingSnapshot = {
    accounts: [makeAccount({ id: 'acc-a' })],
    cards: [makeCard({ id: 'card-active' })],
    transactions: [makeTransaction({ id: 'tx-1' })],
    transfers: [],
  };

  let source: Subject<BankingSnapshot>;
  let calls: number;
  let store: BankingStore;

  const createLoadingService = createServiceFactory({
    service: BankingStore,
    providers: [
      {
        provide: BankingRepository,
        useFactory: (): Partial<BankingRepository> =>
          stubRepository({
            loadSnapshot: (): Observable<BankingSnapshot> => {
              calls += 1;
              return source.asObservable();
            },
          }),
      },
    ],
  });

  beforeEach(() => {
    source = new Subject<BankingSnapshot>();
    calls = 0;
    store = createLoadingService().service;
  });

  it('moves through loading into ready and publishes the dataset', () => {
    store.load();
    expect(store.isLoading()).toBe(true);
    expect(store.error()).toBeNull();

    source.next(snapshot);

    expect(store.isReady()).toBe(true);
    expect(store.accounts()).toEqual(snapshot.accounts);
    expect(store.cards()).toEqual(snapshot.cards);
    expect(store.transactions()).toEqual(snapshot.transactions);
    expect(store.transfers()).toEqual([]);
  });

  it('ignores re-entrant loads while a request is in flight', () => {
    store.load();
    store.load();
    store.load();

    expect(calls).toBe(1);
  });

  it('ignores a load once the dataset is in memory unless it is forced', () => {
    store.load();
    source.next(snapshot);

    store.load();
    expect(calls).toBe(1);

    store.load(true);
    expect(calls).toBe(2);
    expect(store.isLoading()).toBe(true);
  });

  it('surfaces an error state without clearing the previous dataset silently', () => {
    store.load();
    source.error(new Error('offline'));

    expect(store.status()).toBe('error');
    expect(store.error()?.messageKey).toBe(LOAD_ERROR_KEY);
    expect(store.isLoading()).toBe(false);
  });

  it('reports an unreachable API as a connection problem, not as missing data', () => {
    store.load();
    source.error(new DataSourceError('unavailable', 'API_UNAVAILABLE', 'down'));

    expect(store.status()).toBe('error');
    expect(store.error()?.messageKey).toBe(API_UNAVAILABLE_KEY);
    expect(store.error()?.titleKey).toBe('errors.apiUnavailableTitle');
  });
});

describe('resetting the demo dataset', () => {
  const seeded: BankingSnapshot = {
    accounts: [makeAccount({ id: 'acc-seed' })],
    cards: [makeCard({ id: 'card-seed' })],
    transactions: [],
    transfers: [],
  };

  describe('when the adapter owns the dataset', () => {
    const createRestorable = createServiceFactory({
      service: BankingStore,
      providers: [
        {
          provide: BankingRepository,
          useFactory: (): Partial<BankingRepository> =>
            stubRepository({ resetDemoData: () => of(seeded) }),
        },
      ],
    });

    it('adopts the restored snapshot', () => {
      const store = createRestorable().service;

      store.resetDemoData().subscribe();

      expect(store.accounts()).toEqual(seeded.accounts);
      expect(store.cards()).toEqual(seeded.cards);
    });
  });

  describe('when the adapter does not own the dataset', () => {
    const createReadOnly = createServiceFactory({
      service: BankingStore,
      providers: [
        {
          provide: BankingRepository,
          useFactory: (): Partial<BankingRepository> =>
            stubRepository({
              supportsReset: false,
              resetDemoData: () =>
                throwError(
                  () => new DataSourceError('unsupported', 'RESET_UNSUPPORTED', 'not supported'),
                ),
            }),
        },
      ],
    });

    it('propagates the refusal instead of pretending it worked', () => {
      const store = createReadOnly().service;

      let failed: unknown;
      store.resetDemoData().subscribe({
        error: (error: unknown) => {
          failed = error;
        },
      });

      expect(failed).toBeInstanceOf(DataSourceError);
      expect(store.supportsReset()).toBe(false);
    });
  });
});
