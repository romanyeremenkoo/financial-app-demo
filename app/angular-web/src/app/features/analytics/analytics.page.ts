import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { BankingStore } from '../../application/state/banking.store';
import { monthRange, periodTotals, spendingByCategory } from '../../domain/analytics/analytics';
import { TransactionCategory } from '../../domain/models/transaction.model';
import { transactionCategoryKey } from '../../shared/util/translation-key.util';
import { LanguageService } from '../../core/i18n/language.service';
import { CATEGORY_COLOR } from '../../shared/util/category.util';
import { formatMonthYear } from '../../shared/util/date.util';
import { EmptyStateComponent } from '../../shared/ui/empty-state/empty-state.component';
import { MoneyComponent } from '../../shared/ui/money/money.component';
import { MonthlyBarsComponent } from '../../shared/charts/monthly-bars/monthly-bars.component';
import { PageHeaderComponent } from '../../shared/ui/page-header/page-header.component';
import { SkeletonComponent } from '../../shared/ui/skeleton/skeleton.component';
import { SpendingDonutComponent } from '../../shared/charts/spending-donut/spending-donut.component';

/** Number of months the period selector offers, newest first. */
const SELECTABLE_MONTHS = 6;

/**
 * Spending analytics. The selected period drives every figure on the page,
 * and all aggregation is delegated to the same pure functions the dashboard
 * uses, so the two screens can never disagree.
 */
@Component({
  selector: 'fin-analytics-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    EmptyStateComponent,
    MoneyComponent,
    MonthlyBarsComponent,
    PageHeaderComponent,
    SkeletonComponent,
    SpendingDonutComponent,
    TranslatePipe,
  ],
  templateUrl: './analytics.page.html',
  styleUrl: './analytics.page.scss',
})
export class AnalyticsPage {
  protected readonly store = inject(BankingStore);
  private readonly language = inject(LanguageService);

  /** 0 = current month, 1 = previous month, … */
  protected readonly monthsAgo = signal(0);

  protected readonly periodOptions = computed(() =>
    Array.from({ length: SELECTABLE_MONTHS }, (_, offset) => {
      const start = new Date(monthRange(new Date(), offset).startIso);
      return { offset, label: formatMonthYear(start, this.language.locale()) };
    }),
  );

  private readonly range = computed(() => monthRange(new Date(), this.monthsAgo()));

  protected readonly totals = computed(() =>
    periodTotals(this.store.transactions(), this.range(), this.store.currency),
  );

  protected readonly breakdown = computed(() =>
    spendingByCategory(this.store.transactions(), this.range(), this.store.currency),
  );

  protected readonly periodLabel = computed(
    () => this.periodOptions()[this.monthsAgo()]?.label ?? '',
  );

  protected selectPeriod(offset: number): void {
    this.monthsAgo.set(offset);
  }

  protected categoryKey(category: TransactionCategory): string {
    return transactionCategoryKey(category);
  }

  protected categoryColor(category: TransactionCategory): string {
    return CATEGORY_COLOR[category];
  }
}
