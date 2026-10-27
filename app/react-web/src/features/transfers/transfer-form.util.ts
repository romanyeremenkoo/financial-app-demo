import { z } from 'zod';
import type { CurrencyCode } from '../../domain/money/currency';
import { parseAmountToMinor } from '../../domain/money/money';
import type { TransferErrorCode } from '../../domain/models/transfer.model';

export type TransferStep = 'form' | 'review' | 'receipt';

export type TransferField = 'source' | 'destination' | 'amount';

export const REFERENCE_MAX_LENGTH = 60;

/** Currency of the demo profile; the transfer form is single-currency. */
const FORM_CURRENCY: CurrencyCode = 'EUR';

/**
 * Shape-level validation.
 *
 * Messages are domain error codes rather than prose so the schema stays
 * language-free and the form renders exactly the same translated strings as
 * the business-rule failures raised by the domain policy.
 */
export const transferFormSchema = z.object({
  sourceAccountId: z.string().min(1, { message: 'SOURCE_REQUIRED' }),
  destinationAccountId: z.string().min(1, { message: 'DESTINATION_REQUIRED' }),
  amount: z.string().superRefine((value, ctx) => {
    const raw = value.trim();
    if (raw === '') {
      ctx.addIssue({ code: 'custom', message: 'AMOUNT_REQUIRED' });
      return;
    }
    const minor = parseAmountToMinor(raw, FORM_CURRENCY);
    if (minor === null) {
      ctx.addIssue({ code: 'custom', message: 'AMOUNT_PRECISION' });
      return;
    }
    if (minor <= 0) {
      ctx.addIssue({ code: 'custom', message: 'AMOUNT_NOT_POSITIVE' });
    }
  }),
  reference: z.string().max(REFERENCE_MAX_LENGTH, { message: 'REFERENCE_TOO_LONG' }),
});

export type TransferFormValues = z.infer<typeof transferFormSchema>;

export const EMPTY_TRANSFER_FORM: TransferFormValues = {
  sourceAccountId: '',
  destinationAccountId: '',
  amount: '',
  reference: '',
};

/** Maps domain error codes onto the form control they belong to. */
export const TRANSFER_ERROR_FIELD: Readonly<Record<TransferErrorCode, TransferField>> = {
  SOURCE_REQUIRED: 'source',
  SOURCE_NOT_FOUND: 'source',
  SOURCE_INELIGIBLE: 'source',
  DESTINATION_REQUIRED: 'destination',
  DESTINATION_NOT_FOUND: 'destination',
  DESTINATION_INELIGIBLE: 'destination',
  SAME_ACCOUNT: 'destination',
  AMOUNT_REQUIRED: 'amount',
  AMOUNT_NOT_POSITIVE: 'amount',
  AMOUNT_PRECISION: 'amount',
  CURRENCY_MISMATCH: 'destination',
  INSUFFICIENT_FUNDS: 'amount',
};

export const FIELD_CONTROL: Readonly<Record<TransferField, keyof TransferFormValues>> = {
  source: 'sourceAccountId',
  destination: 'destinationAccountId',
  amount: 'amount',
};
