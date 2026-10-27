import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router';
import { useTranslation } from 'react-i18next';
import { useLanguage } from '../../app/providers/language-context';
import { useDocumentTitle } from '../../app/router/use-document-title';
import { useAccountName } from '../../application/hooks/use-account-name';
import { useBanking } from '../../application/hooks/use-banking';
import {
  DEFAULT_TRANSACTION_FILTER,
  type TransactionFilter,
  type TransactionSort,
  activeFilterCount,
  filterTransactions,
  isDefaultFilter,
} from '../../domain/models/transaction-filter';
import {
  TRANSACTION_CATEGORIES,
  type Transaction,
  type TransactionCategory,
  type TransactionDirection,
} from '../../domain/models/transaction.model';
import { TransactionRow } from '../../shared/ledger/TransactionRow';
import { EmptyState } from '../../shared/ui/EmptyState';
import { FinSelect } from '../../shared/ui/FinSelect';
import { Icon } from '../../shared/ui/Icon';
import { PageHeader } from '../../shared/ui/PageHeader';
import { Skeleton } from '../../shared/ui/Skeleton';
import { groupConsecutive, range } from '../../shared/util/collection.util';
import {
  TODAY_OFFSET,
  YESTERDAY_OFFSET,
  dayKey,
  dayOffset,
  formatFullDate,
} from '../../shared/util/date.util';
import { transactionCategoryKey } from '../../shared/util/translation-key.util';
import { useDebouncedValue } from '../../shared/util/use-debounced-value';
import { TransactionDetailsDialog } from './TransactionDetailsDialog';
import './transactions.scss';

const SORT_OPTIONS: readonly { value: TransactionSort; labelKey: string }[] = [
  { value: 'date-desc', labelKey: 'transactions.sort.dateDesc' },
  { value: 'date-asc', labelKey: 'transactions.sort.dateAsc' },
];

const SKELETON_ROW_COUNT = 6;

/** Keeps typing responsive without re-filtering on every keystroke. */
const FILTER_DEBOUNCE_MS = 150;

/**
 * Transaction history.
 *
 * The form holds the only filter state; the list is a projection of canonical
 * state through the pure domain filter, so the filtering rules are shared with
 * the unit tests rather than reimplemented here.
 */
const TransactionsPage = () => {
  const { t } = useTranslation();
  const { locale } = useLanguage();
  const { state } = useBanking();
  const accountName = useAccountName();
  const [searchParams] = useSearchParams();

  const [filter, setFilter] = useState<TransactionFilter>(() => ({
    ...DEFAULT_TRANSACTION_FILTER,
    accountId: searchParams.get('account') ?? DEFAULT_TRANSACTION_FILTER.accountId,
  }));
  const [selected, setSelected] = useState<Transaction | null>(null);

  useDocumentTitle(t('documentTitle.transactions'));

  const debouncedSearch = useDebouncedValue(filter.search, FILTER_DEBOUNCE_MS);
  const appliedFilter = useMemo(
    () => ({ ...filter, search: debouncedSearch }),
    [filter, debouncedSearch],
  );

  const results = useMemo(
    () => filterTransactions(state.transactions, appliedFilter),
    [state.transactions, appliedFilter],
  );

  const dayLabel = (iso: string): string => {
    const offset = dayOffset(iso);
    if (offset === TODAY_OFFSET) {
      return t('transactions.today');
    }
    if (offset === YESTERDAY_OFFSET) {
      return t('transactions.yesterday');
    }
    return formatFullDate(iso, locale);
  };

  const groups = groupConsecutive(results, (transaction) => dayKey(transaction.bookedAt));
  const loading = state.status === 'loading' || state.status === 'idle';
  const activeCount = activeFilterCount(appliedFilter);
  const hasFilters = !isDefaultFilter(appliedFilter);

  const update = <K extends keyof TransactionFilter>(key: K, value: TransactionFilter[K]): void => {
    setFilter((current) => ({ ...current, [key]: value }));
  };

  const clearFilters = (): void => {
    setFilter({ ...DEFAULT_TRANSACTION_FILTER });
  };

  const accountOptions = useMemo(
    () => [
      { value: 'all', label: t('transactions.allAccounts') },
      ...state.accounts.map((account) => ({ value: account.id, label: account.name })),
    ],
    [state.accounts, t],
  );

  const categoryOptions = useMemo(
    () => [
      { value: 'all', label: t('transactions.allCategories') },
      ...TRANSACTION_CATEGORIES.map((category) => ({
        value: category,
        label: t(transactionCategoryKey(category)),
      })),
    ],
    [t],
  );

  const directionOptions = useMemo(
    () => [
      { value: 'all', label: t('transactions.allDirections') },
      { value: 'credit', label: t('transactions.moneyIn') },
      { value: 'debit', label: t('transactions.moneyOut') },
    ],
    [t],
  );

  const sortOptions = useMemo(
    () => SORT_OPTIONS.map((option) => ({ value: option.value, label: t(option.labelKey) })),
    [t],
  );

  return (
    <div className="transactions">
      <PageHeader title={t('transactions.title')} subtitle={t('transactions.subtitle')}>
        {hasFilters ? (
          <button
            type="button"
            className="fin-button fin-button--secondary"
            data-qa="clear-filters"
            onClick={clearFilters}
          >
            <Icon name="close" size={16} />
            {t('transactions.clearFilters')}
            {activeCount > 0 ? <span className="count">{activeCount}</span> : null}
          </button>
        ) : null}
      </PageHeader>

      <form
        className="filters"
        onSubmit={(event) => {
          event.preventDefault();
        }}
      >
        <div className="filters__search fin-field">
          <label className="fin-label" htmlFor="transaction-search">
            {t('transactions.search')}
          </label>
          <div className="search-input">
            <span className="search-input__icon" aria-hidden="true">
              <Icon name="search" size={18} />
            </span>
            <input
              id="transaction-search"
              className="fin-input search-input__control"
              type="search"
              value={filter.search}
              data-qa="search-input"
              placeholder={t('transactions.searchPlaceholder')}
              autoComplete="off"
              onChange={(event) => {
                update('search', event.target.value);
              }}
            />
          </div>
        </div>

        <div className="fin-field">
          <FinSelect
            id="filter-account"
            label={t('transactions.account')}
            value={filter.accountId}
            qa="account-filter"
            options={accountOptions}
            onChange={(next) => {
              update('accountId', next);
            }}
          />
        </div>

        <div className="fin-field">
          <FinSelect
            id="filter-category"
            label={t('transactions.category')}
            value={filter.category}
            qa="category-filter"
            options={categoryOptions}
            onChange={(next) => {
              update('category', next as TransactionCategory | 'all');
            }}
          />
        </div>

        <div className="fin-field">
          <FinSelect
            id="filter-direction"
            label={t('transactions.direction')}
            value={filter.direction}
            qa="direction-filter"
            options={directionOptions}
            onChange={(next) => {
              update('direction', next as TransactionDirection | 'all');
            }}
          />
        </div>

        <div className="fin-field">
          <FinSelect
            id="filter-sort"
            label={t('transactions.sortBy')}
            value={filter.sort}
            qa="sort-filter"
            options={sortOptions}
            onChange={(next) => {
              update('sort', next as TransactionSort);
            }}
          />
        </div>
      </form>

      <section
        className="results"
        aria-label={t('transactions.results')}
        data-qa="transactions-results"
      >
        {loading ? (
          <div className="results__skeleton">
            {range(SKELETON_ROW_COUNT).map((row) => (
              <Skeleton key={row} height="56px" />
            ))}
          </div>
        ) : results.length === 0 ? (
          <EmptyState
            icon="search"
            qa="transactions-empty"
            title={t('transactions.emptyTitle')}
            message={t('transactions.emptyMessage')}
          >
            <button type="button" className="fin-button fin-button--primary" onClick={clearFilters}>
              {t('transactions.clearAllFilters')}
            </button>
          </EmptyState>
        ) : (
          <>
            <p className="results__count" aria-live="polite" data-qa="result-count">
              {t(results.length === 1 ? 'transactions.countOne' : 'transactions.count', {
                count: results.length,
              })}
            </p>

            {groups.map((group, index) => (
              <section className="group" key={`${group.key}-${String(index)}`}>
                <h2 className="group__title">{dayLabel(group.items[0]?.bookedAt ?? group.key)}</h2>
                <ul className="group__list">
                  {group.items.map((transaction) => (
                    <li key={transaction.id}>
                      <TransactionRow
                        transaction={transaction}
                        accountName={accountName(transaction.accountId)}
                        hideAmount={state.balancesHidden}
                        onSelect={setSelected}
                      />
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </>
        )}
      </section>

      {selected === null ? null : (
        <TransactionDetailsDialog
          transaction={selected}
          accountName={accountName(selected.accountId)}
          onClose={() => {
            setSelected(null);
          }}
        />
      )}
    </div>
  );
};

export default TransactionsPage;
