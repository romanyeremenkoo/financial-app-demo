import { type CSSProperties, useState } from 'react';
import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import { useLanguage } from '../../app/providers/language-context';
import { useDocumentTitle } from '../../app/router/use-document-title';
import { useAccountName } from '../../application/hooks/use-account-name';
import { useBanking } from '../../application/hooks/use-banking';
import { useLedgerSelectors } from '../../application/hooks/use-ledger-selectors';
import type { Transaction } from '../../domain/models/transaction.model';
import { SpendingDonut } from '../../shared/charts/SpendingDonut';
import { AccountCard } from '../../shared/ledger/AccountCard';
import { TransactionRow } from '../../shared/ledger/TransactionRow';
import { EmptyState } from '../../shared/ui/EmptyState';
import { Icon } from '../../shared/ui/Icon';
import { Money } from '../../shared/ui/Money';
import { PageHeader } from '../../shared/ui/PageHeader';
import { Skeleton } from '../../shared/ui/Skeleton';
import { CATEGORY_COLOR } from '../../shared/util/category.util';
import { range } from '../../shared/util/collection.util';
import { formatMonthYear } from '../../shared/util/date.util';
import { transactionCategoryKey } from '../../shared/util/translation-key.util';
import { TransactionDetailsDialog } from '../transactions/TransactionDetailsDialog';
import './dashboard.scss';

const TOP_CATEGORY_COUNT = 5;

const SKELETON_ROW_COUNT = 4;

/**
 * Dashboard overview. Every figure here is a projection of the single canonical
 * dataset, so the page can never disagree with the transactions or accounts
 * screens.
 */
const DashboardPage = () => {
  const { t } = useTranslation();
  const { locale } = useLanguage();
  const { state, currency } = useBanking();
  const {
    totalBalance,
    totalAvailable,
    currentMonthTotals,
    currentMonthSpending,
    recentTransactions,
  } = useLedgerSelectors();
  const accountName = useAccountName();
  const [selected, setSelected] = useState<Transaction | null>(null);

  useDocumentTitle(t('documentTitle.dashboard'));

  const loading = state.status === 'loading' || state.status === 'idle';
  const hidden = state.balancesHidden;
  const topCategories = currentMonthSpending.slice(0, TOP_CATEGORY_COUNT);

  return (
    <div className="dashboard">
      <PageHeader
        title={t('dashboard.title')}
        subtitle={t('dashboard.subtitle', { month: formatMonthYear(new Date(), locale) })}
      >
        <Link className="fin-button fin-button--secondary" to="/transactions">
          <Icon name="list" size={18} />
          {t('dashboard.transactionHistory')}
        </Link>
        <Link className="fin-button fin-button--primary" to="/transfers">
          <Icon name="transfer" size={18} />
          {t('dashboard.moveMoney')}
        </Link>
      </PageHeader>

      <section className="kpis" aria-label={t('dashboard.keyFigures')}>
        <article className="kpi kpi--hero">
          <p className="kpi__label">{t('dashboard.totalBalance')}</p>
          {loading ? (
            <Skeleton width="180px" height="34px" />
          ) : (
            <>
              <Money className="kpi__value" value={totalBalance} hidden={hidden} />
              <p className="kpi__meta">
                {t('dashboard.availableNow')}
                <Money value={totalAvailable} hidden={hidden} />
              </p>
            </>
          )}
        </article>

        <article className="kpi">
          <p className="kpi__label">
            <span className="kpi__dot kpi__dot--in" aria-hidden="true" />
            {t('dashboard.incomeThisMonth')}
          </p>
          {loading ? (
            <Skeleton width="130px" height="26px" />
          ) : (
            <Money className="kpi__value" value={currentMonthTotals.income} hidden={hidden} />
          )}
        </article>

        <article className="kpi">
          <p className="kpi__label">
            <span className="kpi__dot kpi__dot--out" aria-hidden="true" />
            {t('dashboard.spentThisMonth')}
          </p>
          {loading ? (
            <Skeleton width="130px" height="26px" />
          ) : (
            <>
              <Money className="kpi__value" value={currentMonthTotals.expenses} hidden={hidden} />
              <p className="kpi__meta">
                {t('dashboard.net')}
                <Money
                  value={currentMonthTotals.net}
                  signDisplay="always"
                  tone="signed"
                  hidden={hidden}
                />
              </p>
            </>
          )}
        </article>
      </section>

      <section className="panel" aria-labelledby="accounts-heading">
        <div className="panel__head">
          <h2 id="accounts-heading" className="panel__title">
            {t('dashboard.accounts')}
          </h2>
          <Link className="panel__link" to="/accounts">
            {t('dashboard.manageAccounts')}
            <Icon name="arrow-right" size={16} />
          </Link>
        </div>

        <div className="account-grid">
          {loading
            ? range(SKELETON_ROW_COUNT).map((row) => (
                <div className="skeleton-card" key={row}>
                  <Skeleton height="120px" />
                </div>
              ))
            : state.accounts.map((account) => (
                <AccountCard key={account.id} account={account} hidden={hidden} />
              ))}
        </div>
      </section>

      <div className="split">
        <section className="panel" aria-labelledby="spending-heading">
          <div className="panel__head">
            <h2 id="spending-heading" className="panel__title">
              {t('dashboard.spendingByCategory')}
            </h2>
            <Link className="panel__link" to="/analytics">
              {t('dashboard.fullAnalytics')}
              <Icon name="arrow-right" size={16} />
            </Link>
          </div>

          {loading ? <Skeleton height="240px" /> : null}
          {!loading && topCategories.length === 0 ? (
            <EmptyState
              icon="chart"
              title={t('dashboard.noSpendingTitle')}
              message={t('dashboard.noSpendingMessage')}
            />
          ) : null}
          {!loading && topCategories.length > 0 ? (
            <div className="spending">
              <SpendingDonut breakdown={currentMonthSpending} currency={currency} hidden={hidden} />
              <ul className="legend">
                {topCategories.map((item) => (
                  <li className="legend__item" key={item.category}>
                    <span
                      className="legend__swatch"
                      style={{ '--swatch': CATEGORY_COLOR[item.category] } as CSSProperties}
                    />
                    <span className="legend__label">
                      {t(transactionCategoryKey(item.category))}
                    </span>
                    <span className="legend__share">{item.share}%</span>
                    <Money className="legend__value" value={item.total} hidden={hidden} />
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </section>

        <section className="panel" aria-labelledby="recent-heading">
          <div className="panel__head">
            <h2 id="recent-heading" className="panel__title">
              {t('dashboard.recentTransactions')}
            </h2>
            <Link className="panel__link" to="/transactions">
              {t('dashboard.seeAll')}
              <Icon name="arrow-right" size={16} />
            </Link>
          </div>

          {loading ? (
            <div className="recent-skeleton">
              {range(SKELETON_ROW_COUNT).map((row) => (
                <Skeleton key={row} height="52px" />
              ))}
            </div>
          ) : recentTransactions.length === 0 ? (
            <EmptyState
              icon="list"
              title={t('dashboard.noTransactionsTitle')}
              message={t('dashboard.noTransactionsMessage')}
            />
          ) : (
            <ul className="recent">
              {recentTransactions.map((transaction) => (
                <li key={transaction.id}>
                  <TransactionRow
                    transaction={transaction}
                    accountName={accountName(transaction.accountId)}
                    hideAmount={hidden}
                    onSelect={setSelected}
                  />
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

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

export default DashboardPage;
