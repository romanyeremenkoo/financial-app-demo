import { Card } from '../../domain/models/card.model';
import { Transaction } from '../../domain/models/transaction.model';
import { Account } from '../../domain/models/account.model';
import { Transfer } from '../../domain/models/transfer.model';
import { BankingSnapshot } from '../repositories/banking-data-source';

/** Key for the persisted demo ledger. Versioned so a schema change is detectable. */
export const DEMO_STATE_KEY = 'financial-app.demo-state';

const SCHEMA_VERSION = 1;

export interface DemoState {
  readonly snapshot: BankingSnapshot;
  /** Idempotency keys of transfers already settled in this browser. */
  readonly processedTokens: readonly string[];
}

interface StoredDemoState {
  readonly version: number;
  readonly state: DemoState;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const isArrayOf = <T>(value: unknown, guard: (item: unknown) => item is T): value is T[] =>
  Array.isArray(value) && value.every(guard);

const isAccount = (value: unknown): value is Account =>
  isRecord(value) &&
  typeof value['id'] === 'string' &&
  typeof value['balanceMinor'] === 'number' &&
  typeof value['availableMinor'] === 'number' &&
  typeof value['currency'] === 'string';

const isCard = (value: unknown): value is Card =>
  isRecord(value) && typeof value['id'] === 'string' && typeof value['accountId'] === 'string';

const isTransaction = (value: unknown): value is Transaction =>
  isRecord(value) &&
  typeof value['id'] === 'string' &&
  typeof value['accountId'] === 'string' &&
  typeof value['amountMinor'] === 'number' &&
  typeof value['direction'] === 'string';

const isTransfer = (value: unknown): value is Transfer =>
  isRecord(value) &&
  typeof value['id'] === 'string' &&
  typeof value['requestToken'] === 'string' &&
  typeof value['amountMinor'] === 'number';

/**
 * Validates the shape before trusting it. Storage is user-writable, so a
 * malformed or outdated payload must degrade to a fresh seed rather than crash
 * the application or poison the ledger.
 */
const isDemoState = (value: unknown): value is DemoState => {
  if (!isRecord(value) || !isRecord(value['snapshot'])) {
    return false;
  }
  const snapshot = value['snapshot'];
  return (
    isArrayOf(snapshot['accounts'], isAccount) &&
    isArrayOf(snapshot['cards'], isCard) &&
    isArrayOf(snapshot['transactions'], isTransaction) &&
    isArrayOf(snapshot['transfers'], isTransfer) &&
    isArrayOf(value['processedTokens'], (item): item is string => typeof item === 'string')
  );
};

export const readDemoState = (): DemoState | null => {
  try {
    const raw = localStorage.getItem(DEMO_STATE_KEY);
    if (raw === null) {
      return null;
    }
    const parsed: unknown = JSON.parse(raw);
    if (!isRecord(parsed) || parsed['version'] !== SCHEMA_VERSION) {
      return null;
    }
    return isDemoState(parsed['state']) ? parsed['state'] : null;
  } catch {
    // Unavailable or corrupted storage is never fatal: the demo just restarts.
    return null;
  }
};

export const writeDemoState = (state: DemoState): void => {
  try {
    const payload: StoredDemoState = { version: SCHEMA_VERSION, state };
    localStorage.setItem(DEMO_STATE_KEY, JSON.stringify(payload));
  } catch {
    // Private-mode or quota failures must not interrupt the demo.
  }
};

export const clearDemoState = (): void => {
  try {
    localStorage.removeItem(DEMO_STATE_KEY);
  } catch {
    // Nothing to recover: the in-memory state remains authoritative.
  }
};
