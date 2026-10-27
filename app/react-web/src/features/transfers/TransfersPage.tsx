import { useMemo, useState } from 'react';
import { Link } from 'react-router';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import { useFeedback } from '../../app/providers/feedback-context';
import { useLanguage } from '../../app/providers/language-context';
import { useDocumentTitle } from '../../app/router/use-document-title';
import { useBanking } from '../../application/hooks/use-banking';
import { useLedgerSelectors } from '../../application/hooks/use-ledger-selectors';
import { useTransfer } from '../../application/hooks/use-transfer';
import { findAccount, type Account } from '../../domain/models/account.model';
import {
  type TransferDraft,
  type TransferErrorCode,
  isTransferErrorCode,
} from '../../domain/models/transfer.model';
import { money, parseAmountToMinor } from '../../domain/money/money';
import { FinSelect } from '../../shared/ui/FinSelect';
import { Icon } from '../../shared/ui/Icon';
import { Money } from '../../shared/ui/Money';
import { PageHeader } from '../../shared/ui/PageHeader';
import { Skeleton } from '../../shared/ui/Skeleton';
import { formatFullDate, formatTime } from '../../shared/util/date.util';
import { createRequestToken } from '../../shared/util/id.util';
import { transferErrorKey } from '../../shared/util/translation-key.util';
import {
  EMPTY_TRANSFER_FORM,
  FIELD_CONTROL,
  REFERENCE_MAX_LENGTH,
  TRANSFER_ERROR_FIELD,
  type TransferField,
  type TransferFormValues,
  type TransferStep,
  transferFormSchema,
} from './transfer-form.util';
import './transfers.scss';

const STEPS: readonly { readonly id: TransferStep; readonly labelKey: string }[] = [
  { id: 'form', labelKey: 'transfers.stepDetails' },
  { id: 'review', labelKey: 'transfers.stepReview' },
  { id: 'receipt', labelKey: 'transfers.stepReceipt' },
];

const accountLabel = (account: Account): string => `${account.name} · ${account.maskedIban}`;

/**
 * Internal transfer wizard: capture → review → confirm → receipt.
 *
 * The component owns presentation only. Shape validation comes from the Zod
 * schema, business rules from the domain policy, and the idempotency token is
 * minted once per review so double submissions cannot duplicate a transfer.
 */
const TransfersPage = () => {
  const { t } = useTranslation();
  const { locale } = useLanguage();
  const feedback = useFeedback();
  const { state, currency } = useBanking();
  const { eligibleAccounts } = useLedgerSelectors();
  const transfers = useTransfer();

  const [step, setStep] = useState<TransferStep>('form');
  const [requestToken, setRequestToken] = useState<string | null>(null);
  /** Translation key of the failure shown above the form. */
  const [submitError, setSubmitError] = useState<string | null>(null);

  useDocumentTitle(t('documentTitle.transfers'));

  const { register, handleSubmit, control, reset, formState } = useForm<TransferFormValues>({
    resolver: zodResolver(transferFormSchema),
    defaultValues: EMPTY_TRANSFER_FORM,
    mode: 'onTouched',
  });

  const values = useWatch({ control, defaultValue: EMPTY_TRANSFER_FORM }) as TransferFormValues;

  const draft = useMemo<TransferDraft>(
    () => ({
      sourceAccountId: values.sourceAccountId === '' ? null : values.sourceAccountId,
      destinationAccountId: values.destinationAccountId === '' ? null : values.destinationAccountId,
      amountMinor: parseAmountToMinor(values.amount, currency),
      currency,
      reference: values.reference.trim() === '' ? undefined : values.reference.trim(),
    }),
    [values, currency],
  );

  const validation = useMemo(() => transfers.validate(draft), [transfers, draft]);
  const loading = state.status === 'loading' || state.status === 'idle';

  const sourceAccount = findAccount(state.accounts, draft.sourceAccountId) ?? null;
  const destinationAccount = findAccount(state.accounts, draft.destinationAccountId) ?? null;
  const amountPreview = money(draft.amountMinor ?? 0, currency);
  const remainingAfterTransfer = money(
    sourceAccount === null ? 0 : sourceAccount.availableMinor - (draft.amountMinor ?? 0),
    currency,
  );

  /** Translation key of the error for a field, shown only after interaction. */
  const fieldErrorKey = (field: TransferField): string | null => {
    const control = FIELD_CONTROL[field];
    const touched = formState.touchedFields[control] === true || formState.isSubmitted;
    if (!touched) {
      return null;
    }

    const schemaMessage = formState.errors[control]?.message;
    if (typeof schemaMessage === 'string' && isTransferErrorCode(schemaMessage)) {
      return transferErrorKey(schemaMessage);
    }

    if (validation.ok) {
      return null;
    }
    const match = validation.errors.find(
      (code: TransferErrorCode) => TRANSFER_ERROR_FIELD[code] === field,
    );
    return match === undefined ? null : transferErrorKey(match);
  };

  const destinationOptions = eligibleAccounts.filter(
    (account) => account.id !== draft.sourceAccountId,
  );

  const goToReview = (): void => {
    if (!validation.ok) {
      return;
    }
    setRequestToken(createRequestToken());
    setSubmitError(null);
    setStep('review');
  };

  const backToForm = (): void => {
    setStep('form');
    setRequestToken(null);
    transfers.reset();
    setSubmitError(null);
  };

  const startAnother = (): void => {
    reset(EMPTY_TRANSFER_FORM);
    setRequestToken(null);
    transfers.reset();
    setSubmitError(null);
    setStep('form');
  };

  const confirmTransfer = (): void => {
    if (requestToken === null || transfers.submitting) {
      return;
    }

    void transfers.execute(draft, requestToken).then((result) => {
      if (!result.ok) {
        const [code] = result.errors;
        setSubmitError(
          code !== undefined && isTransferErrorCode(code)
            ? transferErrorKey(code)
            : 'errors.transferFailed',
        );
        feedback.error(t('transfers.failedFeedback'));
        setStep('form');
        return;
      }

      setStep('receipt');
      feedback.success(
        t(result.duplicate ? 'transfers.duplicateFeedback' : 'transfers.successFeedback'),
      );
    });
  };

  const receipt = transfers.receipt;

  return (
    <div className="transfers">
      <PageHeader title={t('transfers.title')} subtitle={t('transfers.subtitle')} />

      <ol className="steps" aria-label={t('transfers.progress')}>
        {STEPS.map((item, index) => (
          <li
            key={item.id}
            className={`steps__item${step === item.id ? ' steps__item--active' : ''}`}
            aria-current={step === item.id ? 'step' : undefined}
          >
            <span className="steps__index">{index + 1}</span> {t(item.labelKey)}
          </li>
        ))}
      </ol>

      {loading ? (
        <div className="panel">
          <Skeleton height="320px" />
        </div>
      ) : null}

      {!loading && step === 'form' ? (
        <form
          className="panel"
          onSubmit={(event) => {
            void handleSubmit(goToReview)(event);
          }}
          noValidate
        >
          {submitError === null ? null : (
            <p className="alert" role="alert" data-qa="transfer-error">
              <Icon name="alert" size={18} />
              {t(submitError)}
            </p>
          )}

          <div className="fin-field">
            <Controller
              control={control}
              name="sourceAccountId"
              render={({ field }) => (
                <FinSelect
                  id="transfer-source"
                  label={t('transfers.fromAccount')}
                  qa="source-account"
                  value={field.value}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                  placeholder={t('transfers.selectAccount')}
                  invalid={fieldErrorKey('source') !== null}
                  describedBy={fieldErrorKey('source') === null ? 'source-hint' : 'source-error'}
                  options={eligibleAccounts.map((account) => ({
                    value: account.id,
                    label: accountLabel(account),
                  }))}
                />
              )}
            />
            {sourceAccount === null ? (
              <p id="source-hint" className="fin-hint">
                {t('transfers.sourceHint')}
              </p>
            ) : (
              <p id="source-hint" className="fin-hint">
                {t('transfers.availableHint')}{' '}
                <Money
                  value={{
                    amountMinor: sourceAccount.availableMinor,
                    currency: sourceAccount.currency,
                  }}
                />
              </p>
            )}
            {fieldErrorKey('source') === null ? null : (
              <p id="source-error" className="fin-error-text" role="alert" data-qa="error-source">
                <Icon name="alert" size={15} />
                {t(fieldErrorKey('source') ?? '')}
              </p>
            )}
          </div>

          <div className="fin-field">
            <Controller
              control={control}
              name="destinationAccountId"
              render={({ field }) => (
                <FinSelect
                  id="transfer-destination"
                  label={t('transfers.toAccount')}
                  qa="destination-account"
                  value={field.value}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                  placeholder={t('transfers.selectAccount')}
                  invalid={fieldErrorKey('destination') !== null}
                  describedBy={
                    fieldErrorKey('destination') === null ? undefined : 'destination-error'
                  }
                  options={destinationOptions.map((account) => ({
                    value: account.id,
                    label: accountLabel(account),
                  }))}
                />
              )}
            />
            {fieldErrorKey('destination') === null ? null : (
              <p
                id="destination-error"
                className="fin-error-text"
                role="alert"
                data-qa="error-destination"
              >
                <Icon name="alert" size={15} />
                {t(fieldErrorKey('destination') ?? '')}
              </p>
            )}
          </div>

          <div className="fin-field">
            <label className="fin-label" htmlFor="transfer-amount">
              {t('transfers.amount', { currency })}
            </label>
            <input
              id="transfer-amount"
              className={`fin-input amount-input${
                fieldErrorKey('amount') === null ? '' : ' is-invalid'
              }`}
              type="text"
              inputMode="decimal"
              data-qa="transfer-amount"
              placeholder={t('transfers.amountPlaceholder')}
              autoComplete="off"
              aria-describedby={fieldErrorKey('amount') === null ? 'amount-hint' : 'amount-error'}
              {...register('amount')}
            />
            <p id="amount-hint" className="fin-hint">
              {t('transfers.amountHint')}
            </p>
            {fieldErrorKey('amount') === null ? null : (
              <p id="amount-error" className="fin-error-text" role="alert" data-qa="error-amount">
                <Icon name="alert" size={15} />
                {t(fieldErrorKey('amount') ?? '')}
              </p>
            )}
          </div>

          <div className="fin-field">
            <label className="fin-label" htmlFor="transfer-reference">
              {t('transfers.reference')}
            </label>
            <input
              id="transfer-reference"
              className="fin-input"
              type="text"
              data-qa="transfer-reference"
              placeholder={t('transfers.referencePlaceholder')}
              maxLength={REFERENCE_MAX_LENGTH}
              autoComplete="off"
              {...register('reference')}
            />
          </div>

          <div className="panel__actions">
            <button
              type="submit"
              className="fin-button fin-button--primary"
              data-qa="continue-to-review"
              disabled={!validation.ok}
            >
              {t('transfers.continueToReview')}
              <Icon name="arrow-right" size={18} />
            </button>
          </div>
        </form>
      ) : null}

      {!loading && step === 'review' ? (
        <section className="panel" aria-labelledby="review-heading">
          <h2 id="review-heading" className="panel__title" data-qa="review-heading">
            {t('transfers.reviewTitle')}
          </h2>
          <p className="panel__lead">{t('transfers.reviewLead')}</p>

          <div className="review-amount">
            <Money value={amountPreview} />
          </div>

          <dl className="summary">
            <div className="summary__row">
              <dt>{t('transfers.from')}</dt>
              <dd>
                {sourceAccount?.name}
                <span>{sourceAccount?.maskedIban}</span>
              </dd>
            </div>
            <div className="summary__row">
              <dt>{t('transfers.to')}</dt>
              <dd>
                {destinationAccount?.name}
                <span>{destinationAccount?.maskedIban}</span>
              </dd>
            </div>
            {draft.reference === undefined ? null : (
              <div className="summary__row">
                <dt>{t('transfers.referenceLabel')}</dt>
                <dd>{draft.reference}</dd>
              </div>
            )}
            <div className="summary__row">
              <dt>{t('transfers.remainingAvailable')}</dt>
              <dd>
                <Money value={remainingAfterTransfer} />
              </dd>
            </div>
          </dl>

          <div className="panel__actions">
            <button
              type="button"
              className="fin-button fin-button--secondary"
              data-qa="back-to-form"
              disabled={transfers.submitting}
              onClick={backToForm}
            >
              {t('transfers.back')}
            </button>
            <button
              type="button"
              className="fin-button fin-button--primary"
              data-qa="confirm-transfer"
              disabled={transfers.submitting}
              onClick={confirmTransfer}
            >
              {transfers.submitting ? (
                <>
                  <Icon name="clock" size={18} />
                  {t('transfers.processing')}
                </>
              ) : (
                <>
                  <Icon name="check" size={18} />
                  {t('transfers.confirm')}
                </>
              )}
            </button>
          </div>
        </section>
      ) : null}

      {!loading && step === 'receipt' && receipt !== null ? (
        <section
          className="panel receipt"
          aria-labelledby="receipt-heading"
          data-qa="transfer-receipt"
        >
          <span className="receipt__badge" aria-hidden="true">
            <Icon name="check" size={26} />
          </span>
          <h2 id="receipt-heading" className="panel__title">
            {t('transfers.receiptTitle')}
          </h2>
          <p className="panel__lead">
            <Money value={{ amountMinor: receipt.amountMinor, currency: receipt.currency }} />{' '}
            {t('transfers.receiptLead')}
          </p>

          <dl className="summary">
            <div className="summary__row">
              <dt>{t('transfers.from')}</dt>
              <dd>{findAccount(state.accounts, receipt.sourceAccountId)?.name}</dd>
            </div>
            <div className="summary__row">
              <dt>{t('transfers.to')}</dt>
              <dd>{findAccount(state.accounts, receipt.destinationAccountId)?.name}</dd>
            </div>
            {receipt.reference === undefined ? null : (
              <div className="summary__row">
                <dt>{t('transfers.referenceLabel')}</dt>
                <dd>{receipt.reference}</dd>
              </div>
            )}
            <div className="summary__row">
              <dt>{t('transfers.completed')}</dt>
              <dd>
                {`${formatFullDate(receipt.createdAt, locale)} · ${formatTime(
                  receipt.createdAt,
                  locale,
                )}`}
              </dd>
            </div>
            <div className="summary__row">
              <dt>{t('transfers.transferId')}</dt>
              <dd className="summary__mono">{receipt.id}</dd>
            </div>
          </dl>

          <div className="panel__actions">
            <Link
              className="fin-button fin-button--secondary"
              data-qa="receipt-view-transactions"
              to="/transactions"
            >
              {t('transfers.viewTransactions')}
            </Link>
            <button type="button" className="fin-button fin-button--primary" onClick={startAnother}>
              {t('transfers.makeAnother')}
            </button>
          </div>
        </section>
      ) : null}
    </div>
  );
};

export default TransfersPage;
