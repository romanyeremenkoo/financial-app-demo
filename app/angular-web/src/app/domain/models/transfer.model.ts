import { CurrencyCode } from '../money/currency';
import { AccountId } from './account.model';
import { TransactionId } from './transaction.model';

export type TransferId = string;

/** User intent, before any validation has been applied. */
export interface TransferDraft {
  readonly sourceAccountId: AccountId | null;
  readonly destinationAccountId: AccountId | null;
  readonly amountMinor: number | null;
  readonly currency: CurrencyCode;
  readonly reference?: string;
}

/**
 * A validated, executed internal transfer.
 *
 * Double-entry model: every completed transfer owns exactly one debit
 * transaction on the source account and one credit transaction on the
 * destination account. The two legs always carry the same absolute amount and
 * currency, so the sum of all ledger movements for a transfer is zero.
 */
export interface Transfer {
  readonly id: TransferId;
  readonly sourceAccountId: AccountId;
  readonly destinationAccountId: AccountId;
  readonly amountMinor: number;
  readonly currency: CurrencyCode;
  readonly reference?: string;
  readonly createdAt: string;
  readonly status: 'completed';
  readonly debitTransactionId: TransactionId;
  readonly creditTransactionId: TransactionId;
  /** Client-generated idempotency key; repeated submissions reuse it. */
  readonly requestToken: string;
}

export type TransferErrorCode =
  | 'SOURCE_REQUIRED'
  | 'DESTINATION_REQUIRED'
  | 'SAME_ACCOUNT'
  | 'SOURCE_NOT_FOUND'
  | 'DESTINATION_NOT_FOUND'
  | 'SOURCE_INELIGIBLE'
  | 'DESTINATION_INELIGIBLE'
  | 'AMOUNT_REQUIRED'
  | 'AMOUNT_NOT_POSITIVE'
  | 'AMOUNT_PRECISION'
  | 'CURRENCY_MISMATCH'
  | 'INSUFFICIENT_FUNDS';

export type TransferValidation =
  { readonly ok: true } | { readonly ok: false; readonly errors: readonly TransferErrorCode[] };

const TRANSFER_ERROR_CODES: readonly TransferErrorCode[] = [
  'SOURCE_REQUIRED',
  'DESTINATION_REQUIRED',
  'SAME_ACCOUNT',
  'SOURCE_NOT_FOUND',
  'DESTINATION_NOT_FOUND',
  'SOURCE_INELIGIBLE',
  'DESTINATION_INELIGIBLE',
  'AMOUNT_REQUIRED',
  'AMOUNT_NOT_POSITIVE',
  'AMOUNT_PRECISION',
  'CURRENCY_MISMATCH',
  'INSUFFICIENT_FUNDS',
];

/** Narrows an arbitrary backend code to a known transfer rejection reason. */
export const isTransferErrorCode = (value: unknown): value is TransferErrorCode =>
  typeof value === 'string' && TRANSFER_ERROR_CODES.includes(value as TransferErrorCode);

export const firstTransferError = (validation: TransferValidation): TransferErrorCode | null =>
  validation.ok || validation.errors.length === 0 ? null : validation.errors[0];
