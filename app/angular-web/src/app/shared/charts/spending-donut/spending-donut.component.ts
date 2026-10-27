import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { EChartsCoreOption } from 'echarts/core';
import { NgxEchartsDirective } from 'ngx-echarts';
import { CategorySpend } from '../../../domain/analytics/analytics';
import { transactionCategoryKey } from '../../util/translation-key.util';
import { LanguageService } from '../../../core/i18n/language.service';
import { translateNow } from '../../../core/i18n/translate.util';
import { MASKED_AMOUNT, formatMoney, money } from '../../../domain/money/money';
import { CurrencyCode } from '../../../domain/money/currency';
import { CATEGORY_COLOR } from '../../util/category.util';
import { CHART_TOOLTIP_STYLE } from '../../../core/charts/chart-theme';

const DONUT_RADIUS = ['62%', '86%'];
const DONUT_CENTER = ['50%', '50%'];
const DONUT_PAD_ANGLE = 2;
const DONUT_SLICE_RADIUS = 6;
const DONUT_EMPHASIS_SCALE = 4;

/**
 * Donut chart of spending by category. The chart is a pure projection of the
 * breakdown computed in the domain layer; it never aggregates anything itself.
 */
@Component({
  selector: 'fin-spending-donut',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgxEchartsDirective, TranslatePipe],
  template: `
    <div class="donut">
      <div
        echarts
        class="donut__canvas"
        [options]="chartOptions()"
        [autoResize]="true"
        role="img"
        [attr.aria-label]="accessibleSummary()"
      ></div>
      <div class="donut__center" aria-hidden="true">
        <span class="donut__center-label">{{ 'charts.spent' | translate }}</span>
        <span class="donut__center-value">{{ totalLabel() }}</span>
      </div>
    </div>
  `,
  styleUrl: './spending-donut.component.scss',
})
export class SpendingDonutComponent {
  private readonly translate = inject(TranslateService);
  private readonly language = inject(LanguageService);

  readonly breakdown = input.required<readonly CategorySpend[]>();
  readonly currency = input.required<CurrencyCode>();
  readonly hidden = input<boolean>(false);

  private readonly totalMinor = computed(() =>
    this.breakdown().reduce((sum, item) => sum + item.total.amountMinor, 0),
  );

  readonly totalLabel = computed(() =>
    formatMoney(money(this.totalMinor(), this.currency()), {
      hidden: this.hidden(),
      locale: this.language.locale(),
    }),
  );

  readonly accessibleSummary = computed(() => {
    const parts = this.breakdown().map(
      (item) =>
        `${translateNow(this.translate, transactionCategoryKey(item.category))} ${item.share}%`,
    );
    return parts.length === 0
      ? translateNow(this.translate, 'charts.noSpending')
      : translateNow(this.translate, 'charts.spendingSummary', { parts: parts.join(', ') });
  });

  readonly chartOptions = computed<EChartsCoreOption>(() => {
    const data = this.breakdown().map((item) => ({
      name: translateNow(this.translate, transactionCategoryKey(item.category)),
      value: item.total.amountMinor,
      itemStyle: { color: CATEGORY_COLOR[item.category] },
    }));
    const currency = this.currency();
    const isHidden = this.hidden();
    const locale = this.language.locale();

    return {
      tooltip: {
        trigger: 'item',
        ...CHART_TOOLTIP_STYLE,
        formatter: (params: { name: string; value: number; percent: number }) => {
          const amount = isHidden
            ? MASKED_AMOUNT
            : formatMoney(money(params.value, currency), { signDisplay: 'never', locale });
          return `${params.name}<br/><strong>${amount}</strong> · ${params.percent}%`;
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
          data,
        },
      ],
    };
  });
}
