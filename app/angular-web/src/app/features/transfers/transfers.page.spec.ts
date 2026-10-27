import { Signal } from '@angular/core';
import { FormControl, FormGroup } from '@angular/forms';
import { Spectator, createComponentFactory, mockProvider } from '@ngneat/spectator/vitest';
import { beforeEach, describe, expect, it } from 'vitest';
import { makeAccount, makeSnapshot } from '../../../testing/fixtures';
import { provideTestTranslations } from '../../../testing/i18n';
import { provideTestDataSource } from '../../../testing/data-source';
import { BankingStore } from '../../application/state/banking.store';
import { FeedbackService } from '../../core/services/feedback.service';
import { transferErrorKey } from '../../shared/util/translation-key.util';
import { TransferField, TransferStep } from './transfer-form.util';
import { TransfersPage } from './transfers.page';

/** Narrow view over the component's protected members, used by the tests only. */
interface TransfersPageInternals {
  readonly form: FormGroup<{
    sourceAccountId: FormControl<string>;
    destinationAccountId: FormControl<string>;
    amount: FormControl<string>;
    reference: FormControl<string>;
  }>;
  readonly step: Signal<TransferStep>;
  readonly canReview: Signal<boolean>;
  fieldErrorKey(field: TransferField): string | null;
  goToReview(): void;
}

describe('TransfersPage reactive form', () => {
  let spectator: Spectator<TransfersPage>;
  let page: TransfersPageInternals;

  const createComponent = createComponentFactory({
    component: TransfersPage,
    providers: [mockProvider(FeedbackService), provideTestTranslations(), provideTestDataSource()],
    detectChanges: false,
  });

  const fillValidForm = (): void =>
    page.form.setValue({
      sourceAccountId: 'acc-source',
      destinationAccountId: 'acc-destination',
      amount: '25.00',
      reference: 'Rent',
    });

  beforeEach(() => {
    spectator = createComponent();
    spectator
      .inject(BankingStore)
      .hydrate(
        makeSnapshot([
          makeAccount({ id: 'acc-source', availableMinor: 100_000 }),
          makeAccount({ id: 'acc-destination', type: 'savings', availableMinor: 50_000 }),
        ]),
        [],
      );
    page = spectator.component as unknown as TransfersPageInternals;
    spectator.detectChanges();
  });

  it('starts invalid and blocks the review step', () => {
    // Reading canReview while empty guards against a computed that never
    // re-evaluates because it short-circuited on a non-signal property.
    expect(page.canReview()).toBe(false);

    page.goToReview();
    expect(page.step()).toBe('form');
  });

  it('keeps field errors hidden until the control is touched or dirty', () => {
    expect(page.fieldErrorKey('amount')).toBeNull();

    page.form.controls.amount.markAsTouched();
    expect(page.fieldErrorKey('amount')).toBe(transferErrorKey('AMOUNT_REQUIRED'));
  });

  it('rejects a non-positive amount', () => {
    fillValidForm();
    page.form.controls.amount.setValue('0');
    page.form.controls.amount.markAsTouched();

    expect(page.form.controls.amount.hasError('amountNotPositive')).toBe(true);
    expect(page.fieldErrorKey('amount')).toBe(transferErrorKey('AMOUNT_NOT_POSITIVE'));
    expect(page.canReview()).toBe(false);
  });

  it('rejects an amount with more decimals than the currency allows', () => {
    fillValidForm();
    page.form.controls.amount.setValue('10.005');
    page.form.controls.amount.markAsTouched();

    expect(page.form.controls.amount.hasError('amountFormat')).toBe(true);
    expect(page.fieldErrorKey('amount')).toBe(transferErrorKey('AMOUNT_PRECISION'));
  });

  it('surfaces the domain rule when both accounts are the same', () => {
    fillValidForm();
    page.form.controls.destinationAccountId.setValue('acc-source');
    page.form.controls.destinationAccountId.markAsTouched();

    expect(page.fieldErrorKey('destination')).toBe(transferErrorKey('SAME_ACCOUNT'));
    expect(page.canReview()).toBe(false);
  });

  it('surfaces insufficient funds from the domain policy', () => {
    fillValidForm();
    page.form.controls.amount.setValue('5000.00');
    page.form.controls.amount.markAsTouched();

    expect(page.fieldErrorKey('amount')).toBe(transferErrorKey('INSUFFICIENT_FUNDS'));
    expect(page.canReview()).toBe(false);
  });

  it('enforces the reference length limit', () => {
    fillValidForm();
    page.form.controls.reference.setValue('x'.repeat(61));

    expect(page.form.controls.reference.hasError('maxlength')).toBe(true);
    expect(page.canReview()).toBe(false);
  });

  it('moves to the review step once every rule passes', () => {
    fillValidForm();

    expect(page.canReview()).toBe(true);
    page.goToReview();
    expect(page.step()).toBe('review');
  });
});
