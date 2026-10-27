import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useLanguage } from '../../app/providers/language-context';
import type { CategorySpend } from '../../domain/analytics/analytics';
import type { CurrencyCode } from '../../domain/money/currency';
import { MASKED_AMOUNT, formatMoney, money } from '../../domain/money/money';
import { CATEGORY_COLOR } from '../util/category.util';
import { transactionCategoryKey } from '../util/translation-key.util';
import { CHART_TOOLTIP_STYLE } from './chart-theme';
import { useChart } from './use-chart';
import './spending-donut.scss';

const DONUT_RADIUS = ['62%', '86%'];
const DONUT_CENTER = ['50%', '50%'];
const DONUT_PAD_ANGLE = 2;
const DONUT_SLICE_RADIUS = 6;
const DONUT_EMPHASIS_SCALE = 4;

export interface SpendingDonutProps {
  readonly breakdown: readonly CategorySpend[];
  readonly currency: CurrencyCode;
  readonly hidden?: boolean;
}

/**
 * Donut chart of spending by category. The chart is a pure projection of the
 * breakdown computed in the domain layer; it never aggregates anything itself.
 */
export const SpendingDonut = ({ breakdown, currency, hidden = false }: SpendingDonutProps) => {
  const { t } = useTranslation();
  const { locale } = useLanguage();

  const totalMinor = breakdown.reduce((sum, item) => sum + item.total.amountMinor, 0);
  const totalLabel = formatMoney(money(totalMinor, currency), { hidden, locale });

  const accessibleSummary = useMemo(() => {
    const parts = breakdown.map(
      (item) => `${t(transactionCategoryKey(item.category))} ${String(item.share)}%`,
    );
    return parts.length === 0
      ? t('charts.noSpending')
      : t('charts.spendingSummary', { parts: parts.join(', ') });
  }, [breakdown, t]);

  const option = useMemo(
    () => ({
      tooltip: {
        trigger: 'item',
        ...CHART_TOOLTIP_STYLE,
        formatter: (params: { name: string; value: number; percent: number }) => {
          const amount = hidden
            ? MASKED_AMOUNT
            : formatMoney(money(params.value, currency), { signDisplay: 'never', locale });
          return `${params.name}<br/><strong>${amount}</strong> · ${String(params.percent)}%`;
        },
      },
      series: [
        {
          type: 'pie',
          radius: DONUT_RADIUS,
          center: DONUT_CENTER,
          avoidLabelOverlap: true,
          padAngle: DONUT_PAD_ANGLE,
          itemStyle: { borderRadius: DONUT_SLICE_RADIUS },
          label: { show: false },
          labelLine: { show: false },
          emphasis: { scaleSize: DONUT_EMPHASIS_SCALE },
          data: breakdown.map((item) => ({
            name: t(transactionCategoryKey(item.category)),
            value: item.total.amountMinor,
            itemStyle: { color: CATEGORY_COLOR[item.category] },
          })),
        },
      ],
    }),
    [breakdown, currency, hidden, locale, t],
  );

  const containerRef = useChart(option);

  return (
    <div className="donut">
      <div
        ref={containerRef}
        className="donut__canvas"
        role="img"
        aria-label={accessibleSummary}
        data-qa="spending-donut"
      />
      <div className="donut__center" aria-hidden="true">
        <span className="donut__center-label">{t('charts.spent')}</span>
        <span className="donut__center-value">{totalLabel}</span>
      </div>
    </div>
  );
};
