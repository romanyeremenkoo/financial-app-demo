import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { EChartsCoreOption } from 'echarts/core';
import { NgxEchartsDirective } from 'ngx-echarts';
import { MonthlyPoint } from '../../../domain/analytics/analytics';
import { CurrencyCode, CURRENCY_SYMBOL, minorUnitScale } from '../../../domain/money/currency';
import { formatMoney, money } from '../../../domain/money/money';
import {
  CHART_AXIS_LINE,
  CHART_EXPENSE_COLOR,
  CHART_INCOME_COLOR,
  CHART_LABEL_STYLE,
  CHART_SPLIT_LINE,
  CHART_TOOLTIP_STYLE,
} from '../../../core/charts/chart-theme';
import { formatMonthKey } from '../../util/date.util';
import { LanguageService } from '../../../core/i18n/language.service';
import { translateNow } from '../../../core/i18n/translate.util';

const CHART_GRID = { left: 8, right: 8, top: 28, bottom: 8, containLabel: true } as const;
const LEGEND_MARKER_SIZE = 10;
const BAR_MAX_WIDTH = 18;
const BAR_TOP_RADIUS = 6;
const BAR_BORDER_RADIUS = [BAR_TOP_RADIUS, BAR_TOP_RADIUS, 0, 0];

/** Grouped income vs. expense bars for the last months of activity. */
@Component({
  selector: 'fin-monthly-bars',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgxEchartsDirective],
  template: `
    <div
      echarts
      class="bars"
      [options]="chartOptions()"
      [autoResize]="true"
      role="img"
      [attr.aria-label]="accessibleSummary()"
    ></div>
  `,
  styleUrl: './monthly-bars.component.scss',
})
export class MonthlyBarsComponent {
  private readonly translate = inject(TranslateService);
  private readonly language = inject(LanguageService);

  readonly series = input.required<readonly MonthlyPoint[]>();
  readonly currency = input.required<CurrencyCode>();

  readonly accessibleSummary = computed(() => {
    const locale = this.language.locale();
    return this.series()
      .map((point) =>
        translateNow(this.translate, 'analytics.chartSeriesDescription', {
          month: formatMonthKey(point.month, locale),
          income: formatMoney(point.income, { locale }),
          expenses: formatMoney(point.expenses, { locale }),
        }),
      )
      .join('. ');
  });

  readonly chartOptions = computed<EChartsCoreOption>(() => {
    const points = this.series();
    const currency = this.currency();
    const scale = minorUnitScale(currency);
    const locale = this.language.locale();

    return {
      grid: CHART_GRID,
      tooltip: {
        trigger: 'axis',
        ...CHART_TOOLTIP_STYLE,
        valueFormatter: (value: number) =>
          formatMoney(money(Math.round(value * scale), currency), { signDisplay: 'never', locale }),
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
        data: points.map((point) => formatMonthKey(point.month, locale)),
        axisLine: { lineStyle: { color: CHART_AXIS_LINE } },
        axisTick: { show: false },
        axisLabel: CHART_LABEL_STYLE,
      },
      yAxis: {
        type: 'value',
        splitLine: { lineStyle: { color: CHART_SPLIT_LINE } },
        axisLabel: {
          ...CHART_LABEL_STYLE,
          formatter: (value: number) => `${CURRENCY_SYMBOL[currency]}${Math.round(value)}`,
        },
      },
      series: [
        {
          name: translateNow(this.translate, 'analytics.chartIncome'),
          type: 'bar',
          barMaxWidth: BAR_MAX_WIDTH,
          itemStyle: { color: CHART_INCOME_COLOR, borderRadius: BAR_BORDER_RADIUS },
          data: points.map((point) => point.income.amountMinor / scale),
        },
        {
          name: translateNow(this.translate, 'analytics.chartExpenses'),
          type: 'bar',
          barMaxWidth: BAR_MAX_WIDTH,
          itemStyle: { color: CHART_EXPENSE_COLOR, borderRadius: BAR_BORDER_RADIUS },
          data: points.map((point) => point.expenses.amountMinor / scale),
        },
      ],
    };
  });
}
