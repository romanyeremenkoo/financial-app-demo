import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { BankingStore } from '../../application/state/banking.store';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { Transaction, TransactionCategory } from '../../domain/models/transaction.model';
import { CATEGORY_COLOR } from '../../shared/util/category.util';
import { formatMonthYear } from '../../shared/util/date.util';
import { AccountCardComponent } from '../../shared/ledger/account-card/account-card.component';
import { EmptyStateComponent } from '../../shared/ui/empty-state/empty-state.component';
import { IconComponent } from '../../shared/ui/icon/icon.component';
import { MoneyComponent } from '../../shared/ui/money/money.component';
import { PageHeaderComponent } from '../../shared/ui/page-header/page-header.component';
import { SkeletonComponent } from '../../shared/ui/skeleton/skeleton.component';
import { SpendingDonutComponent } from '../../shared/charts/spending-donut/spending-donut.component';
import { TransactionRowComponent } from '../../shared/ledger/transaction-row/transaction-row.component';
import {
  TRANSACTION_DETAILS_DIALOG_WIDTH,
  TransactionDetailsData,
  TransactionDetailsDialog,
} from '../transactions/transaction-details.dialog';
import { range } from '../../shared/util/collection.util';
import { transactionCategoryKey } from '../../shared/util/translation-key.util';
import { LanguageService } from '../../core/i18n/language.service';
import { translateNow } from '../../core/i18n/translate.util';

const TOP_CATEGORY_COUNT = 5;

const SKELETON_ROW_COUNT = 4;

/**
 * Dashboard overview. Every figure here is a computed projection of the single
 * store dataset, so the page can never disagree with the transactions or
 * accounts screens.
 */
@Component({
  selector: 'fin-dashboard-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    AccountCardComponent,
    EmptyStateComponent,
    IconComponent,
    MoneyComponent,
    PageHeaderComponent,
    SkeletonComponent,
    SpendingDonutComponent,
    TransactionRowComponent,
    TranslatePipe,
  ],
  templateUrl: './dashboard.page.html',
  styleUrl: './dashboard.page.scss',
})
export class DashboardPage {
  protected readonly store = inject(BankingStore);
  private readonly dialog = inject(MatDialog);
  private readonly language = inject(LanguageService);
  private readonly translate = inject(TranslateService);

  protected readonly monthLabel = computed(() =>
    formatMonthYear(new Date(), this.language.locale()),
  );

  protected readonly topCategories = computed(() =>
    this.store.currentMonthSpending().slice(0, TOP_CATEGORY_COUNT),
  );

  protected readonly skeletonRows = range(SKELETON_ROW_COUNT);

  protected categoryKey(category: TransactionCategory): string {
    return transactionCategoryKey(category);
  }

  protected categoryColor(category: TransactionCategory): string {
    return CATEGORY_COLOR[category];
  }

  protected accountName(transaction: Transaction): string {
    return (
      this.store.accountById(transaction.accountId)?.name ??
      translateNow(this.translate, 'accounts.unknownAccount')
    );
  }

  protected openDetails(transaction: Transaction): void {
    const data: TransactionDetailsData = {
      transaction,
      accountName: this.accountName(transaction),
    };
    this.dialog.open(TransactionDetailsDialog, {
      data,
      width: TRANSACTION_DETAILS_DIALOG_WIDTH,
    });
  }
}
