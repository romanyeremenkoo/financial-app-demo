import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLanguage } from '../../app/providers/language-context';
import { useDocumentTitle } from '../../app/router/use-document-title';
import { useBanking } from '../../application/hooks/use-banking';
import { useLedgerSelectors } from '../../application/hooks/use-ledger-selectors';
import { monthRange, periodTotals, spendingByCategory } from '../../domain/analytics/analytics';
import { MonthlyBars } from '../../shared/charts/MonthlyBars';
import { SpendingDonut } from '../../shared/charts/SpendingDonut';
import { EmptyState } from '../../shared/ui/EmptyState';
import { Money } from '../../shared/ui/Money';
import { PageHeader } from '../../shared/ui/PageHeader';
import { Skeleton } from '../../shared/ui/Skeleton';
import { CATEGORY_COLOR } from '../../shared/util/category.util';
import { formatMonthYear } from '../../shared/util/date.util';
import { transactionCategoryKey } from '../../shared/util/translation-key.util';
import './analytics.scss';

/** Number of months the period selector offers, newest first. */
const SELECTABLE_MONTHS = 6;

/**
 * Spending analytics. The selected period drives every figure on the page,
 * and all aggregation is delegated to the same pure functions the dashboard
 * uses, so the two screens can never disagree.
 */
const AnalyticsPage = () => {
  const { t } = useTranslation();
  const { locale } = useLanguage();
  const { state, currency } = useBanking();
  const { monthlySeries } = useLedgerSelectors();

  /** 0 = current month, 1 = previous month, … */
  const [monthsAgo, setMonthsAgo] = useState(0);

  useDocumentTitle(t('documentTitle.analytics'));

  const periodOptions = useMemo(
    () =>
      Array.from({ length: SELECTABLE_MONTHS }, (_, offset) => {
        const start = new Date(monthRange(new Date(), offset).startIso);
        return { offset, label: formatMonthYear(start, locale) };
      }),
    [locale],
  );

  const range = useMemo(() => monthRange(new Date(), monthsAgo), [monthsAgo]);

  const totals = useMemo(
    () => periodTotals(state.transactions, range, currency),
    [state.transactions, range, currency],
  );

  const breakdown = useMemo(
    () => spendingByCategory(state.transactions, range, currency),
    [state.transactions, range, currency],
  );

  const periodLabel = periodOptions[monthsAgo]?.label ?? '';
  const loading = state.status === 'loading' || state.status === 'idle';
  const hidden = state.balancesHidden;

  return (
    <div className="analytics">
      <PageHeader title={t('analytics.title')} subtitle={t('analytics.subtitle')} />

      <div
        className="period"
        role="group"
        data-qa="period-selector"
        aria-label={t('analytics.selectMonth')}
      >
        {periodOptions.map((option) => (
          <button
            key={option.offset}
            type="button"
            className={`period__button${
              monthsAgo === option.offset ? ' period__button--active' : ''
            }`}
            aria-pressed={monthsAgo === option.offset}
            onClick={() => {
              setMonthsAgo(option.offset);
            }}
          >
            {option.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="panel">
          <Skeleton height="280px" />
        </div>
      ) : (
        <>
          <section className="totals" aria-label={t('analytics.periodTotals')}>
            <article className="total">
              <p className="total__label">{t('analytics.income', { period: periodLabel })}</p>
              <Money className="total__value" value={totals.income} hidden={hidden} />
            </article>
            <article className="total">
              <p className="total__label">{t('analytics.spending', { period: periodLabel })}</p>
              <Money className="total__value" value={totals.expenses} hidden={hidden} />
            </article>
            <article className="total">
              <p className="total__label">{t('analytics.netResult')}</p>
              <Money
                className="total__value"
                value={totals.net}
                signDisplay="always"
                tone="signed"
                hidden={hidden}
              />
            </article>
          </section>

          <div className="split">
            <section className="panel" aria-labelledby="trend-heading">
              <h2 id="trend-heading" className="panel__title">
                {t('analytics.trendTitle')}
              </h2>
              <p className="panel__note">{t('analytics.trendNote')}</p>
              <MonthlyBars series={monthlySeries} currency={currency} />
            </section>

            <section className="panel" aria-labelledby="breakdown-heading">
              <h2 id="breakdown-heading" className="panel__title">
                {t('analytics.breakdownTitle')}
              </h2>

              {breakdown.length === 0 ? (
                <EmptyState
                  icon="chart"
                  title={t('analytics.emptyTitle', { period: periodLabel })}
                  message={t('analytics.emptyMessage')}
                />
              ) : (
                <>
                  <SpendingDonut breakdown={breakdown} currency={currency} hidden={hidden} />

                  <ul className="breakdown">
                    {breakdown.map((item) => (
                      <li className="breakdown__item" key={item.category}>
                        <span className="breakdown__head">
                          <span
                            className="breakdown__swatch"
                            style={{ background: CATEGORY_COLOR[item.category] }}
                            aria-hidden="true"
                          />
                          {t(transactionCategoryKey(item.category))}
                        </span>
                        <span className="breakdown__bar" aria-hidden="true">
                          <span
                            className="breakdown__fill"
                            style={{
                              width: `${item.share}%`,
                              background: CATEGORY_COLOR[item.category],
                            }}
                          />
                        </span>
                        <span className="breakdown__share">{item.share}%</span>
                        <Money className="breakdown__value" value={item.total} hidden={hidden} />
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </section>
          </div>
        </>
      )}
    </div>
  );
};

export default AnalyticsPage;
