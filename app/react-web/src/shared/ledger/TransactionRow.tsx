import type { CSSProperties } from 'react';
import { useTranslation } from 'react-i18next';
import { useLanguage } from '../../app/providers/language-context';
import { type Transaction, signedAmount } from '../../domain/models/transaction.model';
import { Money } from '../ui/Money';
import { StatusChip, type StatusTone } from '../ui/StatusChip';
import { CATEGORY_COLOR } from '../util/category.util';
import { formatShortDate, formatTime } from '../util/date.util';
import { monogram } from '../util/monogram.util';
import { transactionCategoryKey, transactionStatusKey } from '../util/translation-key.util';
import './transaction-row.scss';

const STATUS_TONE: Readonly<Record<Transaction['status'], StatusTone>> = {
  completed: 'success',
  pending: 'warning',
  failed: 'error',
};

export interface TransactionRowProps {
  readonly transaction: Transaction;
  readonly accountName?: string;
  readonly showAccount?: boolean;
  readonly hideAmount?: boolean;
  readonly onSelect: (transaction: Transaction) => void;
}

/**
 * One ledger entry rendered as an accessible button so the row can open the
 * details panel with either pointer or keyboard.
 */
export const TransactionRow = ({
  transaction,
  accountName = '',
  showAccount = true,
  hideAmount = false,
  onSelect,
}: TransactionRowProps) => {
  const { t } = useTranslation();
  const { locale } = useLanguage();

  const accent = { '--accent': CATEGORY_COLOR[transaction.category] } as CSSProperties;
  const directionKey =
    transaction.direction === 'credit' ? 'transactions.directionFrom' : 'transactions.directionTo';

  const ariaLabel = t('transactions.rowDescription', {
    status: t(transactionStatusKey(transaction.status)),
    direction: t(directionKey),
    counterparty: transaction.counterparty,
    date: formatShortDate(transaction.bookedAt, locale),
    time: formatTime(transaction.bookedAt, locale),
  });

  return (
    <button
      type="button"
      className="row"
      data-qa="transaction-row"
      aria-label={ariaLabel}
      onClick={() => {
        onSelect(transaction);
      }}
    >
      <span className="row__avatar" style={accent} aria-hidden="true">
        {monogram(transaction.counterparty)}
      </span>

      <span className="row__main">
        <span className="row__counterparty">{transaction.counterparty}</span>
        <span className="row__meta">
          {t(transactionCategoryKey(transaction.category))}
          {showAccount ? (
            <>
              <span className="row__dot" aria-hidden="true">
                ·
              </span>
              {accountName}
            </>
          ) : null}
        </span>
      </span>

      <span className="row__status">
        {transaction.status === 'completed' ? null : (
          <StatusChip
            label={t(transactionStatusKey(transaction.status))}
            tone={STATUS_TONE[transaction.status]}
          />
        )}
      </span>

      <span className="row__right">
        <Money
          value={signedAmount(transaction)}
          hidden={hideAmount}
          signDisplay="always"
          tone="signed"
        />
        <span className="row__date">{formatShortDate(transaction.bookedAt, locale)}</span>
      </span>
    </button>
  );
};
