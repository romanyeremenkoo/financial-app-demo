import { useId } from 'react';
import { useTranslation } from 'react-i18next';
import { useLanguage } from '../../app/providers/language-context';
import { type Transaction, signedAmount } from '../../domain/models/transaction.model';
import { Modal } from '../../shared/ui/Modal';
import { Money } from '../../shared/ui/Money';
import { StatusChip, type StatusTone } from '../../shared/ui/StatusChip';
import { formatFullDate, formatTime } from '../../shared/util/date.util';
import {
  transactionCategoryKey,
  transactionStatusKey,
} from '../../shared/util/translation-key.util';
import './transaction-details.scss';

const STATUS_TONE: Readonly<Record<Transaction['status'], StatusTone>> = {
  completed: 'success',
  pending: 'warning',
  failed: 'error',
};

export interface TransactionDetailsDialogProps {
  readonly transaction: Transaction;
  readonly accountName: string;
  readonly onClose: () => void;
}

/** Read-only detail view for a single ledger entry. */
export const TransactionDetailsDialog = ({
  transaction,
  accountName,
  onClose,
}: TransactionDetailsDialogProps) => {
  const { t } = useTranslation();
  const { locale } = useLanguage();
  const titleId = useId();

  const bookedLabel = `${formatFullDate(transaction.bookedAt, locale)} · ${formatTime(
    transaction.bookedAt,
    locale,
  )}`;
  const directionKey =
    transaction.direction === 'credit' ? 'transactions.moneyIn' : 'transactions.moneyOut';

  return (
    <Modal
      titleId={titleId}
      title={transaction.counterparty}
      qa="transaction-details"
      onClose={onClose}
      footer={
        <button
          type="button"
          className="fin-button fin-button--secondary"
          data-autofocus="true"
          data-qa="dialog-close"
          onClick={onClose}
        >
          {t('transactions.details.close')}
        </button>
      }
    >
      <div className="details-amount">
        <Money value={signedAmount(transaction)} signDisplay="always" tone="signed" />
        <StatusChip
          label={t(transactionStatusKey(transaction.status))}
          tone={STATUS_TONE[transaction.status]}
        />
      </div>

      <dl className="details">
        <div className="details__row">
          <dt>{t('transactions.details.direction')}</dt>
          <dd>{t(directionKey)}</dd>
        </div>
        <div className="details__row">
          <dt>{t('transactions.details.category')}</dt>
          <dd>{t(transactionCategoryKey(transaction.category))}</dd>
        </div>
        <div className="details__row">
          <dt>{t('transactions.details.account')}</dt>
          <dd>{accountName}</dd>
        </div>
        <div className="details__row">
          <dt>{t('transactions.details.booked')}</dt>
          <dd>{bookedLabel}</dd>
        </div>
        {transaction.reference === undefined || transaction.reference === '' ? null : (
          <div className="details__row">
            <dt>{t('transactions.details.reference')}</dt>
            <dd>{transaction.reference}</dd>
          </div>
        )}
        <div className="details__row">
          <dt data-qa="transaction-id-label">{t('transactions.details.id')}</dt>
          <dd className="details__mono" data-qa="transaction-id">
            {transaction.id}
          </dd>
        </div>
      </dl>
    </Modal>
  );
};
