import { chooseOption } from './select';

export interface TransferDraftInput {
  readonly sourceAccountId: string;
  readonly destinationAccountId: string;
  readonly amount: string;
  readonly reference?: string;
}

export type TransferField = 'source' | 'destination' | 'amount';

type Element = Cypress.Chainable<JQuery<HTMLElement>>;

/** The three steps of the internal transfer wizard: form, review, receipt. */
export class TransfersAccessor {
  readonly sourceAccount = (): Element => cy.qa('source-account');

  readonly destinationAccount = (): Element => cy.qa('destination-account');

  readonly amount = (): Element => cy.qa('transfer-amount');

  readonly reference = (): Element => cy.qa('transfer-reference');

  readonly continueToReviewButton = (): Element => cy.qa('continue-to-review');

  readonly confirmTransferButton = (): Element => cy.qa('confirm-transfer');

  readonly reviewHeading = (): Element => cy.qa('review-heading');

  readonly receipt = (options: Partial<Cypress.Timeoutable> = {}): Element =>
    cy.qa('transfer-receipt', options);

  readonly fieldError = (field: TransferField): Element => cy.qa(`error-${field}`);

  readonly fillDraft = (draft: TransferDraftInput): void => {
    chooseOption('source-account', draft.sourceAccountId);
    chooseOption('destination-account', draft.destinationAccountId);
    this.amount().clear().type(draft.amount);
    if (draft.reference !== undefined) {
      this.reference().clear().type(draft.reference);
    }
  };

  /** Commits the amount field so the validator runs without waiting for a submit. */
  readonly commitAmount = (value: string): void => {
    this.amount().clear().type(value).blur();
  };

  readonly continueToReview = (): void => {
    this.continueToReviewButton().click();
  };

  readonly confirmTransfer = (): void => {
    this.confirmTransferButton().click();
  };

  readonly openTransactionsFromReceipt = (): void => {
    this.receipt().qaIn('receipt-view-transactions').click();
  };
}
