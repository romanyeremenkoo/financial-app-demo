import { chooseOption } from './select';

export type TransactionDirection = 'all' | 'credit' | 'debit';

type Element = Cypress.Chainable<JQuery<HTMLElement>>;

/** Transaction history: the filter bar, the result list and the details overlay. */
export class TransactionsAccessor {
  readonly rows = (): Element => cy.qa('transaction-row');

  readonly resultCount = (): Element => cy.qa('result-count');

  readonly searchInput = (): Element => cy.qa('search-input');

  readonly directionFilter = (): Element => cy.qa('direction-filter');

  readonly categoryFilter = (): Element => cy.qa('category-filter');

  readonly emptyState = (): Element => cy.qa('transactions-empty');

  readonly detailsDialog = (): Element => cy.qa('transaction-details');

  readonly detailsId = (): Element => this.detailsDialog().qaIn('transaction-id');

  readonly detailsIdLabel = (): Element => this.detailsDialog().qaIn('transaction-id-label');

  readonly filterByDirection = (direction: TransactionDirection): void => {
    chooseOption('direction-filter', direction);
  };

  readonly search = (term: string): void => {
    this.searchInput().clear().type(term);
  };

  readonly clearFilters = (): void => {
    cy.qa('clear-filters').click();
  };

  readonly openFirstDetails = (): void => {
    this.rows().first().click();
  };

  readonly closeDetails = (): void => {
    this.detailsDialog().qaIn('dialog-close').click();
  };
}
