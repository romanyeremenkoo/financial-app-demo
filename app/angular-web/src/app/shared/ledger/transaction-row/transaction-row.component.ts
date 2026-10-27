import { ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { Transaction, signedAmount } from '../../../domain/models/transaction.model';
import { formatShortDate, formatTime } from '../../util/date.util';
import { LanguageService } from '../../../core/i18n/language.service';
import { translateNow } from '../../../core/i18n/translate.util';
import { transactionCategoryKey, transactionStatusKey } from '../../util/translation-key.util';
import { CATEGORY_COLOR } from '../../util/category.util';
import { monogram } from '../../util/monogram.util';
import { MoneyComponent } from '../../ui/money/money.component';
import { StatusChipComponent, StatusTone } from '../../ui/status-chip/status-chip.component';

const STATUS_TONE: Readonly<Record<Transaction['status'], StatusTone>> = {
  completed: 'success',
  pending: 'warning',
  failed: 'error',
};

/**
 * One ledger entry rendered as an accessible button so the row can open the
 * details panel with either pointer or keyboard.
 */
@Component({
  selector: 'fin-transaction-row',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MoneyComponent, StatusChipComponent, TranslatePipe],
  template: `
    <button
      type="button"
      class="row"
      data-qa="transaction-row"
      [attr.aria-label]="ariaLabel()"
      (click)="selected.emit(transaction())"
    >
      <span class="row__avatar" [style.--accent]="accent()" aria-hidden="true">
        {{ initials() }}
      </span>

      <span class="row__main">
        <span class="row__counterparty">{{ transaction().counterparty }}</span>
        <span class="row__meta">
          {{ categoryKey() | translate }}
          @if (showAccount()) {
            <span class="row__dot" aria-hidden="true">·</span>
            {{ accountName() }}
          }
        </span>
      </span>

      <span class="row__status">
        @if (transaction().status !== 'completed') {
          <fin-status-chip [label]="statusKey() | translate" [tone]="statusTone()" />
        }
      </span>

      <span class="row__right">
        <fin-money [value]="amount()" [hidden]="hideAmount()" signDisplay="always" tone="signed" />
        <span class="row__date">{{ dateLabel() }}</span>
      </span>
    </button>
  `,
  styleUrl: './transaction-row.component.scss',
})
export class TransactionRowComponent {
  private readonly translate = inject(TranslateService);
  private readonly language = inject(LanguageService);

  readonly transaction = input.required<Transaction>();
  readonly accountName = input<string>('');
  readonly showAccount = input<boolean>(true);
  readonly hideAmount = input<boolean>(false);
  readonly selected = output<Transaction>();

  readonly amount = computed(() => signedAmount(this.transaction()));
  readonly initials = computed(() => monogram(this.transaction().counterparty));
  readonly accent = computed(() => CATEGORY_COLOR[this.transaction().category]);
  readonly categoryKey = computed(() => transactionCategoryKey(this.transaction().category));
  readonly statusKey = computed(() => transactionStatusKey(this.transaction().status));
  readonly statusTone = computed<StatusTone>(() => STATUS_TONE[this.transaction().status]);
  readonly dateLabel = computed(() =>
    formatShortDate(this.transaction().bookedAt, this.language.locale()),
  );

  readonly ariaLabel = computed(() => {
    const value = this.transaction();
    const locale = this.language.locale();
    const directionKey =
      value.direction === 'credit' ? 'transactions.directionFrom' : 'transactions.directionTo';
    return translateNow(this.translate, 'transactions.rowDescription', {
      status: translateNow(this.translate, transactionStatusKey(value.status)),
      direction: translateNow(this.translate, directionKey),
      counterparty: value.counterparty,
      date: formatShortDate(value.bookedAt, locale),
      time: formatTime(value.bookedAt, locale),
    });
  });
}
