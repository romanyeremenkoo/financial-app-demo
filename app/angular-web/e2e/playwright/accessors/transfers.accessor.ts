import { Locator, Page } from '@playwright/test';
import { qa } from './qa';
import { chooseOption } from './select';

export interface TransferDraftInput {
  readonly sourceAccountId: string;
  readonly destinationAccountId: string;
  readonly amount: string;
  readonly reference?: string;
}

export type TransferField = 'source' | 'destination' | 'amount';

/** The three steps of the internal transfer wizard: form, review, receipt. */
export class TransfersAccessor {
  readonly sourceAccount: Locator;
  readonly destinationAccount: Locator;
  readonly amount: Locator;
  readonly reference: Locator;
  readonly continueToReviewButton: Locator;
  readonly confirmTransferButton: Locator;
  readonly reviewHeading: Locator;
  readonly receipt: Locator;
  readonly receiptTransactionsLink: Locator;

  constructor(private readonly page: Page) {
    this.sourceAccount = qa(page, 'source-account');
    this.destinationAccount = qa(page, 'destination-account');
    this.amount = qa(page, 'transfer-amount');
    this.reference = qa(page, 'transfer-reference');
    this.continueToReviewButton = qa(page, 'continue-to-review');
    this.confirmTransferButton = qa(page, 'confirm-transfer');
    this.reviewHeading = qa(page, 'review-heading');
    this.receipt = qa(page, 'transfer-receipt');
    this.receiptTransactionsLink = qa(this.receipt, 'receipt-view-transactions');
  }

  fieldError(field: TransferField): Locator {
    return qa(this.page, `error-${field}`);
  }

  async fillDraft(draft: TransferDraftInput): Promise<void> {
    await chooseOption(this.sourceAccount, draft.sourceAccountId);
    await chooseOption(this.destinationAccount, draft.destinationAccountId);
    await this.amount.fill(draft.amount);
    if (draft.reference !== undefined) {
      await this.reference.fill(draft.reference);
    }
  }

  /** Commits the amount field so the validator runs without waiting for a submit. */
  async commitAmount(value: string): Promise<void> {
    await this.amount.fill(value);
    await this.amount.blur();
  }

  async continueToReview(): Promise<void> {
    await this.continueToReviewButton.click();
  }

  async confirmTransfer(): Promise<void> {
    await this.confirmTransferButton.click();
  }

  async openTransactionsFromReceipt(): Promise<void> {
    await this.receiptTransactionsLink.click();
  }
}
