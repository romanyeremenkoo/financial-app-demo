import { AbstractControl, ValidationErrors } from '@angular/forms';
import { CurrencyCode } from '../../domain/money/currency';
import { parseAmountToMinor } from '../../domain/money/money';
import { TransferErrorCode } from '../../domain/models/transfer.model';

export type TransferStep = 'form' | 'review' | 'receipt';

export type TransferField = 'source' | 'destination' | 'amount';

export const REFERENCE_MAX_LENGTH = 60;

/** Currency of the demo profile; the transfer form is single-currency. */
const FORM_CURRENCY: CurrencyCode = 'EUR';

/** Rejects anything that is not a positive, currency-precise amount. */
export const amountValidator = (control: AbstractControl<string>): ValidationErrors | null => {
  const raw = control.value.trim();
  if (raw === '') {
    return { required: true };
  }

  const minor = parseAmountToMinor(raw, FORM_CURRENCY);
  if (minor === null) {
    return { amountFormat: true };
  }
  return minor <= 0 ? { amountNotPositive: true } : null;
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
