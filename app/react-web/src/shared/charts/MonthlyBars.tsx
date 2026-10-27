import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useLanguage } from '../../app/providers/language-context';
import type { MonthlyPoint } from '../../domain/analytics/analytics';
import { CURRENCY_SYMBOL, type CurrencyCode, minorUnitScale } from '../../domain/money/currency';
import { formatMoney, money } from '../../domain/money/money';
import { formatMonthKey } from '../util/date.util';
import {
  CHART_AXIS_LINE,
  CHART_EXPENSE_COLOR,
  CHART_INCOME_COLOR,
  CHART_LABEL_STYLE,
  CHART_SPLIT_LINE,
  CHART_TOOLTIP_STYLE,
} from './chart-theme';
import { useChart } from './use-chart';
import './monthly-bars.scss';

const CHART_GRID = { left: 8, right: 8, top: 28, bottom: 8, containLabel: true } as const;
const LEGEND_MARKER_SIZE = 10;
const BAR_MAX_WIDTH = 18;
const BAR_TOP_RADIUS = 6;
const BAR_BORDER_RADIUS = [BAR_TOP_RADIUS, BAR_TOP_RADIUS, 0, 0];

export interface MonthlyBarsProps {
  readonly series: readonly MonthlyPoint[];
  readonly currency: CurrencyCode;
}

/** Grouped income vs. expense bars for the last months of activity. */
export const MonthlyBars = ({ series, currency }: MonthlyBarsProps) => {
  const { t } = useTranslation();
  const { locale } = useLanguage();
  const scale = minorUnitScale(currency);

  const accessibleSummary = useMemo(
    () =>
      series
        .map((point) =>
          t('analytics.chartSeriesDescription', {
            month: formatMonthKey(point.month, locale),
            income: formatMoney(point.income, { locale }),
            expenses: formatMoney(point.expenses, { locale }),
          }),
        )
        .join('. '),
    [series, locale, t],
  );

  const option = useMemo(
    () => ({
      grid: CHART_GRID,
      tooltip: {
        trigger: 'axis',
        ...CHART_TOOLTIP_STYLE,
        valueFormatter: (value: number) =>
          formatMoney(money(Math.round(value * scale), currency), {
            signDisplay: 'never',
            locale,
          }),
      },
      legend: {
        top: 0,
        right: 0,
        icon: 'roundRect',
        itemWidth: LEGEND_MARKER_SIZE,
        itemHeight: LEGEND_MARKER_SIZE,
        textStyle: CHART_LABEL_STYLE,
      },
      xAxis: {
        type: 'category',
        data: series.map((point) => formatMonthKey(point.month, locale)),
        axisLine: { lineStyle: { color: CHART_AXIS_LINE } },
        axisTick: { show: false },
        axisLabel: CHART_LABEL_STYLE,
      },
      yAxis: {
        type: 'value',
        splitLine: { lineStyle: { color: CHART_SPLIT_LINE } },
        axisLabel: {
          ...CHART_LABEL_STYLE,
          formatter: (value: number) => `${CURRENCY_SYMBOL[currency]}${String(Math.round(value))}`,
        },
      },
      series: [
        {
          name: t('analytics.chartIncome'),
          type: 'bar',
          barMaxWidth: BAR_MAX_WIDTH,
          itemStyle: { color: CHART_INCOME_COLOR, borderRadius: BAR_BORDER_RADIUS },
          data: series.map((point) => point.income.amountMinor / scale),
        },
        {
          name: t('analytics.chartExpenses'),
          type: 'bar',
          barMaxWidth: BAR_MAX_WIDTH,
          itemStyle: { color: CHART_EXPENSE_COLOR, borderRadius: BAR_BORDER_RADIUS },
          data: series.map((point) => point.expenses.amountMinor / scale),
        },
      ],
    }),
    [series, currency, scale, locale, t],
  );

  const containerRef = useChart(option);

  return (
    <div
      ref={containerRef}
      className="bars"
      role="img"
      aria-label={accessibleSummary}
      data-qa="monthly-bars"
    />
  );
};
