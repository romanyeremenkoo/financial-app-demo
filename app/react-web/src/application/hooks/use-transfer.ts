import { useCallback, useMemo, useState } from 'react';
import {
  DataSourceError,
  TransferRejectedError,
} from '../../data/repositories/banking-data-source';
import { validateTransfer } from '../../domain/transfers/transfer-policy';
import type {
  Transfer,
  TransferDraft,
  TransferValidation,
} from '../../domain/models/transfer.model';
import { useBanking } from './use-banking';

export type TransferResult =
  | { readonly ok: true; readonly transfer: Transfer; readonly duplicate: boolean }
  | { readonly ok: false; readonly errors: readonly string[] };

export interface TransferUseCase {
  readonly submitting: boolean;
  readonly receipt: Transfer | null;
  validate: (draft: TransferDraft) => TransferValidation;
  execute: (draft: TransferDraft, requestToken: string) => Promise<TransferResult>;
  reset: () => void;
}

/**
 * Transfer use case.
 *
 * Validation is delegated to the pure domain policy so the form, the demo
 * adapter and the backend all enforce the same invariants. Execution is
 * guarded against concurrent submissions, and the caller-supplied request
 * token is what makes a retry idempotent rather than duplicating a transfer.
 */
export const useTransfer = (): TransferUseCase => {
  const { state, executeTransfer } = useBanking();
  const [submitting, setSubmitting] = useState(false);
  const [receipt, setReceipt] = useState<Transfer | null>(null);

  const accounts = state.accounts;

  const validate = useCallback(
    (draft: TransferDraft) => validateTransfer(draft, accounts),
    [accounts],
  );

  const execute = useCallback(
    async (draft: TransferDraft, requestToken: string): Promise<TransferResult> => {
      const validation = validateTransfer(draft, accounts);
      if (!validation.ok) {
        return { ok: false, errors: validation.errors };
      }

      setSubmitting(true);
      try {
        const outcome = await executeTransfer(draft, requestToken);
        setReceipt(outcome.transfer);
        return { ok: true, transfer: outcome.transfer, duplicate: outcome.duplicate };
      } catch (error: unknown) {
        if (error instanceof TransferRejectedError) {
          return { ok: false, errors: error.errors };
        }
        if (error instanceof DataSourceError) {
          return { ok: false, errors: [error.code] };
        }
        return { ok: false, errors: ['TRANSFER_FAILED'] };
      } finally {
        setSubmitting(false);
      }
    },
    [accounts, executeTransfer],
  );

  const reset = useCallback(() => {
    setReceipt(null);
  }, []);

  return useMemo(
    () => ({ submitting, receipt, validate, execute, reset }),
    [submitting, receipt, validate, execute, reset],
  );
};
