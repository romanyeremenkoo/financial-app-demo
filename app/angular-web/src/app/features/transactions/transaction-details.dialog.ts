import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { Transaction, signedAmount } from '../../domain/models/transaction.model';
import { formatFullDate, formatTime } from '../../shared/util/date.util';
import {
  transactionCategoryKey,
  transactionStatusKey,
} from '../../shared/util/translation-key.util';
import { LanguageService } from '../../core/i18n/language.service';
import { MoneyComponent } from '../../shared/ui/money/money.component';
import { StatusChipComponent, StatusTone } from '../../shared/ui/status-chip/status-chip.component';

export interface TransactionDetailsData {
  readonly transaction: Transaction;
  readonly accountName: string;
}

export const TRANSACTION_DETAILS_DIALOG_WIDTH = '480px';

const STATUS_TONE: Readonly<Record<Transaction['status'], StatusTone>> = {
  completed: 'success',
  pending: 'warning',
  failed: 'error',
};

/** Read-only detail view for a single ledger entry. */
@Component({
  selector: 'fin-transaction-details-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatDialogModule, MoneyComponent, StatusChipComponent, TranslatePipe],
  host: { 'data-qa': 'transaction-details' },
  template: `
    <h2 mat-dialog-title data-qa="dialog-title">{{ data.transaction.counterparty }}</h2>

    <div mat-dialog-content>
      <div class="amount">
        <fin-money [value]="amount" signDisplay="always" tone="signed" />
        <fin-status-chip [label]="statusKey | translate" [tone]="statusTone" />
      </div>

      <dl class="details">
        <div class="details__row">
          <dt>{{ 'transactions.details.direction' | translate }}</dt>
          <dd>{{ directionKey | translate }}</dd>
        </div>
        <div class="details__row">
          <dt>{{ 'transactions.details.category' | translate }}</dt>
          <dd>{{ categoryKey | translate }}</dd>
        </div>
        <div class="details__row">
          <dt>{{ 'transactions.details.account' | translate }}</dt>
          <dd>{{ data.accountName }}</dd>
        </div>
        <div class="details__row">
          <dt>{{ 'transactions.details.booked' | translate }}</dt>
          <dd>{{ bookedLabel() }}</dd>
        </div>
        @if (data.transaction.reference; as reference) {
          <div class="details__row">
            <dt>{{ 'transactions.details.reference' | translate }}</dt>
            <dd>{{ reference }}</dd>
          </div>
        }
        <div class="details__row">
          <dt data-qa="transaction-id-label">{{ 'transactions.details.id' | translate }}</dt>
          <dd class="details__mono" data-qa="transaction-id">{{ data.transaction.id }}</dd>
        </div>
      </dl>
    </div>

    <div mat-dialog-actions>
      <button
        type="button"
        class="fin-button fin-button--secondary"
        data-qa="dialog-close"
        (click)="close()"
      >
        {{ 'transactions.details.close' | translate }}
      </button>
    </div>
  `,
  styleUrl: './transaction-details.dialog.scss',
})
export class TransactionDetailsDialog {
  readonly data = inject<TransactionDetailsData>(MAT_DIALOG_DATA);
  private readonly dialogRef = inject<MatDialogRef<TransactionDetailsDialog>>(MatDialogRef);
  private readonly language = inject(LanguageService);

  readonly amount = signedAmount(this.data.transaction);

  readonly categoryKey = transactionCategoryKey(this.data.transaction.category);
  readonly statusKey = transactionStatusKey(this.data.transaction.status);
  readonly directionKey =
    this.data.transaction.direction === 'credit' ? 'transactions.moneyIn' : 'transactions.moneyOut';
  readonly statusTone: StatusTone = STATUS_TONE[this.data.transaction.status];
  readonly bookedLabel = computed(() => {
    const locale = this.language.locale();
    const bookedAt = this.data.transaction.bookedAt;
    return `${formatFullDate(bookedAt, locale)} · ${formatTime(bookedAt, locale)}`;
  });

  close(): void {
    this.dialogRef.close();
  }
}
