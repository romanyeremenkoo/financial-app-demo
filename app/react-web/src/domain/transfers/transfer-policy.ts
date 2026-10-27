import { type Account, findAccount, isEligibleForTransfer } from '../models/account.model';
import type { Transaction } from '../models/transaction.model';
import type {
  Transfer,
  TransferDraft,
  TransferErrorCode,
  TransferValidation,
} from '../models/transfer.model';
import { precisionOf } from '../money/currency';

interface AccountRuleCodes {
  readonly required: TransferErrorCode;
  readonly notFound: TransferErrorCode;
  readonly ineligible: TransferErrorCode;
}

const SOURCE_CODES: AccountRuleCodes = {
  required: 'SOURCE_REQUIRED',
  notFound: 'SOURCE_NOT_FOUND',
  ineligible: 'SOURCE_INELIGIBLE',
};

const DESTINATION_CODES: AccountRuleCodes = {
  required: 'DESTINATION_REQUIRED',
  notFound: 'DESTINATION_NOT_FOUND',
  ineligible: 'DESTINATION_INELIGIBLE',
};

const accountErrors = (
  accountId: string | null,
  account: Account | undefined,
  codes: AccountRuleCodes,
): readonly TransferErrorCode[] => {
  if (accountId === null) {
    return [codes.required];
  }
  if (account === undefined) {
    return [codes.notFound];
  }
  return isEligibleForTransfer(account) ? [] : [codes.ineligible];
};

const amountErrors = (amountMinor: number | null): readonly TransferErrorCode[] => {
  if (amountMinor === null) {
    return ['AMOUNT_REQUIRED'];
  }
  if (!Number.isSafeInteger(amountMinor)) {
    return ['AMOUNT_PRECISION'];
  }
  return amountMinor <= 0 ? ['AMOUNT_NOT_POSITIVE'] : [];
};

const isUsableAmount = (amountMinor: number | null): amountMinor is number =>
  amountErrors(amountMinor).length === 0;

const settlementErrors = (
  draft: TransferDraft,
  source: Account | undefined,
  destination: Account | undefined,
): readonly TransferErrorCode[] => {
  if (source === undefined || destination === undefined) {
    return [];
  }
  if (source.currency !== destination.currency || source.currency !== draft.currency) {
    return ['CURRENCY_MISMATCH'];
  }
  return isUsableAmount(draft.amountMinor) && draft.amountMinor > source.availableMinor
    ? ['INSUFFICIENT_FUNDS']
    : [];
};

/**
 * Pure validation of a transfer draft against the current account snapshot.
 * Collects every violated invariant so the UI can surface the most relevant
 * one without re-running the rules.
 */
export const validateTransfer = (
  draft: TransferDraft,
  accounts: readonly Account[],
): TransferValidation => {
  const source = findAccount(accounts, draft.sourceAccountId);
  const destination = findAccount(accounts, draft.destinationAccountId);
  const sameAccount =
    draft.sourceAccountId !== null && draft.sourceAccountId === draft.destinationAccountId;

  const errors: readonly TransferErrorCode[] = [
    ...accountErrors(draft.sourceAccountId, source, SOURCE_CODES),
    ...accountErrors(draft.destinationAccountId, destination, DESTINATION_CODES),
    ...(sameAccount ? (['SAME_ACCOUNT'] as const) : []),
    ...amountErrors(draft.amountMinor),
    ...settlementErrors(draft, source, destination),
  ];

  return errors.length === 0 ? { ok: true } : { ok: false, errors };
};

/**
 * Checks that an amount expressed in minor units is representable in the
 * currency. Minor units are integral by definition, so any fractional value
 * means the caller lost precision upstream.
 */
export const respectsCurrencyPrecision = (draft: TransferDraft): boolean =>
  draft.amountMinor !== null &&
  Number.isSafeInteger(draft.amountMinor) &&
  precisionOf(draft.currency) >= 0;

export interface LedgerSnapshot {
  readonly accounts: readonly Account[];
  readonly transactions: readonly Transaction[];
  readonly transfers: readonly Transfer[];
}

export interface TransferIdentifiers {
  readonly transferId: string;
  readonly debitTransactionId: string;
  readonly creditTransactionId: string;
  readonly requestToken: string;
  /** ISO-8601 booking timestamp applied to both legs. */
  readonly bookedAt: string;
}

export type TransferOutcome =
  | { readonly ok: true; readonly snapshot: LedgerSnapshot; readonly transfer: Transfer }
  | { readonly ok: false; readonly errors: readonly TransferErrorCode[] };

const normaliseReference = (reference: string | undefined): string | undefined => {
  const trimmed = reference?.trim();
  return trimmed === undefined || trimmed === '' ? undefined : trimmed;
};

/**
 * Pure double-entry application of a transfer.
 *
 * On success it returns a brand new snapshot where:
 *  - the source account balance and available funds decrease by the amount,
 *  - the destination account balance and available funds increase by it,
 *  - two linked transactions (debit + credit) are appended,
 *  - the transfer record is appended.
 *
 * On failure nothing is mutated and no partial state is produced, which keeps
 * the "invalid transfers never change balances" invariant trivially true.
 */
export const applyTransfer = (
  snapshot: LedgerSnapshot,
  draft: TransferDraft,
  ids: TransferIdentifiers,
): TransferOutcome => {
  const validation = validateTransfer(draft, snapshot.accounts);
  if (!validation.ok) {
    return { ok: false, errors: validation.errors };
  }

  const source = findAccount(snapshot.accounts, draft.sourceAccountId);
  const destination = findAccount(snapshot.accounts, draft.destinationAccountId);
  const amountMinor = draft.amountMinor;

  // Validation above already guarantees all three are present; this narrows the
  // types without an unsafe cast.
  if (source === undefined || destination === undefined || amountMinor === null) {
    return { ok: false, errors: ['AMOUNT_REQUIRED'] };
  }

  const reference = normaliseReference(draft.reference);

  const accounts = snapshot.accounts.map((account) => {
    if (account.id === source.id) {
      return {
        ...account,
        balanceMinor: account.balanceMinor - amountMinor,
        availableMinor: account.availableMinor - amountMinor,
      };
    }
    if (account.id === destination.id) {
      return {
        ...account,
        balanceMinor: account.balanceMinor + amountMinor,
        availableMinor: account.availableMinor + amountMinor,
      };
    }
    return account;
  });

  const debit: Transaction = {
    id: ids.debitTransactionId,
    accountId: source.id,
    counterparty: destination.name,
    category: 'transfer',
    bookedAt: ids.bookedAt,
    amountMinor,
    currency: draft.currency,
    direction: 'debit',
    status: 'completed',
    reference,
    transferId: ids.transferId,
  };

  const credit: Transaction = {
    id: ids.creditTransactionId,
    accountId: destination.id,
    counterparty: source.name,
    category: 'transfer',
    bookedAt: ids.bookedAt,
    amountMinor,
    currency: draft.currency,
    direction: 'credit',
    status: 'completed',
    reference,
    transferId: ids.transferId,
  };

  const transfer: Transfer = {
    id: ids.transferId,
    sourceAccountId: source.id,
    destinationAccountId: destination.id,
    amountMinor,
    currency: draft.currency,
    reference,
    createdAt: ids.bookedAt,
    status: 'completed',
    debitTransactionId: debit.id,
    creditTransactionId: credit.id,
    requestToken: ids.requestToken,
  };

  return {
    ok: true,
    transfer,
    snapshot: {
      accounts,
      transactions: [credit, debit, ...snapshot.transactions],
      transfers: [transfer, ...snapshot.transfers],
    },
  };
};
