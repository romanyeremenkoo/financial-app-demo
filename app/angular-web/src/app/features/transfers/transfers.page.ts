import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { startWith, take } from 'rxjs';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { BankingStore } from '../../application/state/banking.store';
import { TransferResult, TransferService } from '../../application/use-cases/transfer.service';
import { FeedbackService } from '../../core/services/feedback.service';
import { Account } from '../../domain/models/account.model';
import { TransferDraft } from '../../domain/models/transfer.model';
import { transferErrorKey } from '../../shared/util/translation-key.util';
import { LanguageService } from '../../core/i18n/language.service';
import { translateNow } from '../../core/i18n/translate.util';
import { formatFullDate, formatTime } from '../../shared/util/date.util';
import { money, parseAmountToMinor } from '../../domain/money/money';
import { createRequestToken } from '../../shared/util/id.util';
import {
  FinSelectComponent,
  type FinSelectOption,
} from '../../shared/ui/fin-select/fin-select.component';
import { IconComponent } from '../../shared/ui/icon/icon.component';
import { MoneyComponent } from '../../shared/ui/money/money.component';
import { PageHeaderComponent } from '../../shared/ui/page-header/page-header.component';
import { SkeletonComponent } from '../../shared/ui/skeleton/skeleton.component';
import {
  REFERENCE_MAX_LENGTH,
  TRANSFER_ERROR_FIELD,
  TransferField,
  TransferStep,
  amountValidator,
} from './transfer-form.util';

/**
 * Internal transfer wizard: capture → review → confirm → receipt.
 *
 * The component owns presentation only. Validation and execution are delegated
 * to the domain policy and the transfer use case, and the idempotency token is
 * minted once per review so double submissions cannot duplicate a transfer.
 */
@Component({
  selector: 'fin-transfers-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    RouterLink,
    FinSelectComponent,
    IconComponent,
    MoneyComponent,
    PageHeaderComponent,
    SkeletonComponent,
    TranslatePipe,
  ],
  templateUrl: './transfers.page.html',
  styleUrl: './transfers.page.scss',
})
export class TransfersPage {
  protected readonly store = inject(BankingStore);
  protected readonly transfers = inject(TransferService);
  private readonly feedback = inject(FeedbackService);
  private readonly formBuilder = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);
  private readonly language = inject(LanguageService);
  private readonly translate = inject(TranslateService);

  protected readonly step = signal<TransferStep>('form');
  protected readonly referenceMaxLength = REFERENCE_MAX_LENGTH;
  private readonly requestToken = signal<string | null>(null);
  /** Translation key of the failure shown above the form. */
  protected readonly submitError = signal<string | null>(null);

  protected readonly form = this.formBuilder.nonNullable.group({
    sourceAccountId: ['', Validators.required],
    destinationAccountId: ['', Validators.required],
    amount: ['', amountValidator],
    reference: ['', Validators.maxLength(REFERENCE_MAX_LENGTH)],
  });

  private readonly formValue = toSignal(
    this.form.valueChanges.pipe(startWith(this.form.getRawValue())),
    { initialValue: this.form.getRawValue() },
  );

  protected readonly draft = computed<TransferDraft>(() => {
    this.formValue();
    const raw = this.form.getRawValue();
    return {
      sourceAccountId: raw.sourceAccountId === '' ? null : raw.sourceAccountId,
      destinationAccountId: raw.destinationAccountId === '' ? null : raw.destinationAccountId,
      amountMinor: parseAmountToMinor(raw.amount, this.store.currency),
      currency: this.store.currency,
      reference: raw.reference.trim() === '' ? undefined : raw.reference.trim(),
    };
  });

  protected readonly validation = computed(() => this.transfers.validate(this.draft()));

  /**
   * Read the reactive validation first: `form.valid` is a plain property, so
   * short-circuiting on it would leave this computed with no signal
   * dependencies and permanently cached.
   */
  protected readonly canReview = computed(() => this.validation().ok && this.form.valid);

  protected readonly sourceAccount = computed<Account | null>(() => {
    const id = this.draft().sourceAccountId;
    return id === null ? null : (this.store.accountById(id) ?? null);
  });

  protected readonly destinationAccount = computed<Account | null>(() => {
    const id = this.draft().destinationAccountId;
    return id === null ? null : (this.store.accountById(id) ?? null);
  });

  protected readonly amountPreview = computed(() =>
    money(this.draft().amountMinor ?? 0, this.store.currency),
  );

  protected readonly remainingAfterTransfer = computed(() => {
    const source = this.sourceAccount();
    const amount = this.draft().amountMinor ?? 0;
    return money(source === null ? 0 : source.availableMinor - amount, this.store.currency);
  });

  protected readonly receipt = this.transfers.receipt;

  protected readonly receiptDate = computed(() => {
    const value = this.receipt();
    if (value === null) {
      return '';
    }
    const locale = this.language.locale();
    return `${formatFullDate(value.createdAt, locale)} · ${formatTime(value.createdAt, locale)}`;
  });

  /** Translation key of the domain error for a field, shown only after interaction. */
  protected fieldErrorKey(field: TransferField): string | null {
    const control = this.controlFor(field);

    if (!control.touched && !control.dirty) {
      return null;
    }

    if (field === 'amount' && control.invalid) {
      if (control.hasError('required')) {
        return transferErrorKey('AMOUNT_REQUIRED');
      }
      if (control.hasError('amountNotPositive')) {
        return transferErrorKey('AMOUNT_NOT_POSITIVE');
      }
      return transferErrorKey('AMOUNT_PRECISION');
    }

    const result = this.validation();
    if (result.ok) {
      return null;
    }

    const match = result.errors.find((code) => TRANSFER_ERROR_FIELD[code] === field);
    if (match === undefined) {
      return null;
    }
    if ((match === 'SOURCE_REQUIRED' || match === 'DESTINATION_REQUIRED') && !control.touched) {
      return null;
    }
    return transferErrorKey(match);
  }

  protected destinationOptions(): readonly Account[] {
    const sourceId = this.draft().sourceAccountId;
    return this.store.eligibleAccounts().filter((account) => account.id !== sourceId);
  }

  protected readonly sourceOptions = computed<readonly FinSelectOption[]>(() =>
    this.store.eligibleAccounts().map((account) => ({
      value: account.id,
      label: this.accountLabel(account),
    })),
  );

  protected readonly destinationSelectOptions = computed<readonly FinSelectOption[]>(() => {
    const sourceId = this.draft().sourceAccountId;
    return this.store
      .eligibleAccounts()
      .filter((account) => account.id !== sourceId)
      .map((account) => ({ value: account.id, label: this.accountLabel(account) }));
  });

  protected goToReview(): void {
    this.form.markAllAsTouched();
    if (!this.canReview()) {
      return;
    }
    this.requestToken.set(createRequestToken());
    this.submitError.set(null);
    this.step.set('review');
  }

  protected backToForm(): void {
    this.step.set('form');
    this.requestToken.set(null);
    this.transfers.reset();
    this.submitError.set(null);
  }

  protected confirmTransfer(): void {
    const token = this.requestToken();
    if (token === null || this.transfers.isSubmitting()) {
      return;
    }

    this.transfers
      .execute(this.draft(), token)
      .pipe(take(1), takeUntilDestroyed(this.destroyRef))
      .subscribe((result) => this.handleResult(result));
  }

  protected startAnother(): void {
    this.form.reset({ sourceAccountId: '', destinationAccountId: '', amount: '', reference: '' });
    this.requestToken.set(null);
    this.transfers.reset();
    this.submitError.set(null);
    this.step.set('form');
  }

  protected accountLabel(account: Account): string {
    return `${account.name} · ${account.maskedIban}`;
  }

  private handleResult(result: TransferResult): void {
    if (!result.ok) {
      this.submitError.set(transferErrorKey(result.errors[0]));
      this.feedback.error(translateNow(this.translate, 'transfers.failedFeedback'));
      this.step.set('form');
      return;
    }

    this.step.set('receipt');
    this.feedback.success(
      translateNow(
        this.translate,
        result.duplicate ? 'transfers.duplicateFeedback' : 'transfers.successFeedback',
      ),
    );
  }

  private controlFor(field: TransferField) {
    if (field === 'source') {
      return this.form.controls.sourceAccountId;
    }
    return field === 'destination'
      ? this.form.controls.destinationAccountId
      : this.form.controls.amount;
  }
}
