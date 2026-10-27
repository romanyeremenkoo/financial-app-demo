import type { Account } from '../../domain/models/account.model';
import type { Card } from '../../domain/models/card.model';
import type { Transaction } from '../../domain/models/transaction.model';
import type { Transfer } from '../../domain/models/transfer.model';
import type { BankingSnapshot } from '../repositories/banking-data-source';

const STORAGE_KEY = 'financial-app.demo-state';

/**
 * Bump whenever the persisted shape changes. A stored payload written by an
 * older version is discarded rather than migrated: the demo dataset is
 * reproducible, so rebuilding it is always safe and never loses real data.
 */
export const DEMO_STATE_VERSION = 1;

interface PersistedDemoState {
  readonly version: number;
  readonly accounts: readonly Account[];
  readonly cards: readonly Card[];
  readonly transactions: readonly Transaction[];
  readonly transfers: readonly Transfer[];
  /** Request tokens of transfers already settled, for duplicate protection. */
  readonly processedTokens: readonly string[];
}

export interface DemoState {
  readonly snapshot: BankingSnapshot;
  readonly processedTokens: readonly string[];
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const isArrayOfObjects = (value: unknown): value is Record<string, unknown>[] =>
  Array.isArray(value) && value.every(isRecord);

const isStringArray = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((entry) => typeof entry === 'string');

/**
 * Structural validation of untrusted local storage.
 *
 * `localStorage` is user-writable and therefore never a security boundary; a
 * payload that does not match the expected shape is rejected so a corrupted
 * entry can never crash the application.
 */
const parseState = (raw: string): DemoState | null => {
  const parsed: unknown = JSON.parse(raw);
  if (!isRecord(parsed) || parsed['version'] !== DEMO_STATE_VERSION) {
    return null;
  }

  const { accounts, cards, transactions, transfers, processedTokens } =
    parsed as Partial<PersistedDemoState>;

  if (
    !isArrayOfObjects(accounts) ||
    !isArrayOfObjects(cards) ||
    !isArrayOfObjects(transactions) ||
    !isArrayOfObjects(transfers) ||
    !isStringArray(processedTokens)
  ) {
    return null;
  }

  return {
    snapshot: {
      accounts,
      cards,
      transactions,
      transfers,
    },
    processedTokens,
  };
};

export const readDemoState = (): DemoState | null => {
  try {
    const raw = globalThis.localStorage.getItem(STORAGE_KEY);
    return raw === null ? null : parseState(raw);
  } catch {
    // Private mode, disabled storage or malformed JSON: start from the seed.
    return null;
  }
};

export const writeDemoState = (state: DemoState): void => {
  const payload: PersistedDemoState = {
    version: DEMO_STATE_VERSION,
    accounts: state.snapshot.accounts,
    cards: state.snapshot.cards,
    transactions: state.snapshot.transactions,
    transfers: state.snapshot.transfers,
    processedTokens: state.processedTokens,
  };

  try {
    globalThis.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // Intentionally ignored: the in-memory state stays authoritative, the demo
    // simply will not survive a reload.
  }
};

export const clearDemoState = (): void => {
  try {
    globalThis.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Intentionally ignored.
  }
};
