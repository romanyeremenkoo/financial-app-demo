import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { ActivatedRoute } from '@angular/router';
import { debounceTime, startWith } from 'rxjs';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { BankingStore } from '../../application/state/banking.store';
import {
  DEFAULT_TRANSACTION_FILTER,
  TransactionFilter,
  TransactionSort,
  activeFilterCount,
  filterTransactions,
  isDefaultFilter,
} from '../../domain/models/transaction-filter';
import {
  TRANSACTION_CATEGORIES,
  Transaction,
  TransactionCategory,
} from '../../domain/models/transaction.model';
import {
  TODAY_OFFSET,
  YESTERDAY_OFFSET,
  dayOffset,
  formatFullDate,
} from '../../shared/util/date.util';
import { transactionCategoryKey } from '../../shared/util/translation-key.util';
import { LanguageService } from '../../core/i18n/language.service';
import { translateNow } from '../../core/i18n/translate.util';
import { range } from '../../shared/util/collection.util';
import { EmptyStateComponent } from '../../shared/ui/empty-state/empty-state.component';
import {
  FinSelectComponent,
  type FinSelectOption,
} from '../../shared/ui/fin-select/fin-select.component';
import { IconComponent } from '../../shared/ui/icon/icon.component';
import { PageHeaderComponent } from '../../shared/ui/page-header/page-header.component';
import { SkeletonComponent } from '../../shared/ui/skeleton/skeleton.component';
import { TransactionRowComponent } from '../../shared/ledger/transaction-row/transaction-row.component';
import {
  TRANSACTION_DETAILS_DIALOG_WIDTH,
  TransactionDetailsData,
  TransactionDetailsDialog,
} from './transaction-details.dialog';

interface TransactionGroup {
  readonly label: string;
  readonly transactions: readonly Transaction[];
}

const SORT_OPTIONS: readonly { value: TransactionSort; labelKey: string }[] = [
  { value: 'date-desc', labelKey: 'transactions.sort.dateDesc' },
  { value: 'date-asc', labelKey: 'transactions.sort.dateAsc' },
];

const SKELETON_ROW_COUNT = 6;

/** Keeps typing responsive without re-filtering on every keystroke. */
const FILTER_DEBOUNCE_MS = 150;

/**
 * Transaction history. The form is the only source of filter state; the list
 * is a computed projection of store data through the pure domain filter, so
 * filtering logic is shared with the unit tests rather than reimplemented.
 */
@Component({
  selector: 'fin-transactions-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    EmptyStateComponent,
    FinSelectComponent,
    IconComponent,
    PageHeaderComponent,
    SkeletonComponent,
    TransactionRowComponent,
    TranslatePipe,
  ],
  templateUrl: './transactions.page.html',
  styleUrl: './transactions.page.scss',
})
export class TransactionsPage {
  protected readonly store = inject(BankingStore);
  private readonly dialog = inject(MatDialog);
  private readonly route = inject(ActivatedRoute);
  private readonly formBuilder = inject(FormBuilder);
  private readonly language = inject(LanguageService);
  private readonly translate = inject(TranslateService);

  protected readonly sortOptions = SORT_OPTIONS;
  protected readonly categories = TRANSACTION_CATEGORIES;
  protected readonly skeletonRows = range(SKELETON_ROW_COUNT);

  protected readonly form = this.formBuilder.nonNullable.group({
    search: DEFAULT_TRANSACTION_FILTER.search,
    category: DEFAULT_TRANSACTION_FILTER.category as TransactionCategory | 'all',
    direction: DEFAULT_TRANSACTION_FILTER.direction as 'all' | 'debit' | 'credit',
    accountId: DEFAULT_TRANSACTION_FILTER.accountId,
    sort: DEFAULT_TRANSACTION_FILTER.sort,
  });

  private readonly formValue = toSignal(
    this.form.valueChanges.pipe(
      debounceTime(FILTER_DEBOUNCE_MS),
      startWith(this.form.getRawValue()),
    ),
    { initialValue: this.form.getRawValue() },
  );

  protected readonly filter = computed<TransactionFilter>(() => {
    // Read the debounced stream, but always project the typed raw value.
    this.formValue();
    return this.form.getRawValue();
  });

  protected readonly results = computed(() =>
    filterTransactions(this.store.transactions(), this.filter()),
  );

  protected readonly activeCount = computed(() => activeFilterCount(this.filter()));
  protected readonly hasFilters = computed(() => !isDefaultFilter(this.filter()));

  protected readonly groups = computed<readonly TransactionGroup[]>(() => {
    this.language.locale();
    const groups: TransactionGroup[] = [];
    let current: { label: string; transactions: Transaction[] } | null = null;

    for (const transaction of this.results()) {
      const label = this.dayLabel(transaction.bookedAt);
      if (current === null || current.label !== label) {
        current = { label, transactions: [] };
        groups.push(current);
      }
      current.transactions.push(transaction);
    }
    return groups;
  });

  private readonly accountParam = toSignal(this.route.queryParamMap, { initialValue: null });
  private readonly appliedParam = signal<string | null>(null);

  constructor() {
    effect(() => {
      const params = this.accountParam();
      const accountId = params?.get('account') ?? null;
      if (accountId !== null && accountId !== this.appliedParam()) {
        this.appliedParam.set(accountId);
        this.form.controls.accountId.setValue(accountId);
      }
    });
  }

  protected categoryKey(category: TransactionCategory): string {
    return transactionCategoryKey(category);
  }

  private dayLabel(iso: string): string {
    const offset = dayOffset(iso);
    if (offset === TODAY_OFFSET) {
      return translateNow(this.translate, 'transactions.today');
    }
    if (offset === YESTERDAY_OFFSET) {
      return translateNow(this.translate, 'transactions.yesterday');
    }
    return formatFullDate(iso, this.language.locale());
  }

  protected accountName(transaction: Transaction): string {
    return (
      this.store.accountById(transaction.accountId)?.name ??
      translateNow(this.translate, 'accounts.unknownAccount')
    );
  }

  protected clearFilters(): void {
    this.form.reset({ ...DEFAULT_TRANSACTION_FILTER });
  }

  protected readonly accountOptions = computed<readonly FinSelectOption[]>(() => {
    this.language.locale();
    return [
      { value: 'all', label: translateNow(this.translate, 'transactions.allAccounts') },
      ...this.store.accounts().map((account) => ({ value: account.id, label: account.name })),
    ];
  });

  protected readonly categoryOptions = computed<readonly FinSelectOption[]>(() => {
    this.language.locale();
    return [
      { value: 'all', label: translateNow(this.translate, 'transactions.allCategories') },
      ...TRANSACTION_CATEGORIES.map((category) => ({
        value: category,
        label: translateNow(this.translate, transactionCategoryKey(category)),
      })),
    ];
  });

  protected readonly directionOptions = computed<readonly FinSelectOption[]>(() => {
    this.language.locale();
    return [
      { value: 'all', label: translateNow(this.translate, 'transactions.allDirections') },
      { value: 'credit', label: translateNow(this.translate, 'transactions.moneyIn') },
      { value: 'debit', label: translateNow(this.translate, 'transactions.moneyOut') },
    ];
  });

  protected readonly sortSelectOptions = computed<readonly FinSelectOption[]>(() => {
    this.language.locale();
    return SORT_OPTIONS.map((option) => ({
      value: option.value,
      label: translateNow(this.translate, option.labelKey),
    }));
  });

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
