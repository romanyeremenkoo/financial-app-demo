import type { Locator, Page } from '@playwright/test';
import { qa } from './qa';
import { chooseOption } from './select';

export type TransactionDirection = 'all' | 'credit' | 'debit';

/** Transaction history: the filter bar, the result list and the details overlay. */
export class TransactionsAccessor {
  readonly rows: Locator;
  readonly results: Locator;
  readonly resultCount: Locator;
  readonly searchInput: Locator;
  readonly directionFilter: Locator;
  readonly categoryFilter: Locator;
  readonly accountFilter: Locator;
  readonly sortFilter: Locator;
  readonly clearFiltersButton: Locator;
  readonly emptyState: Locator;
  readonly detailsDialog: Locator;
  readonly detailsId: Locator;
  readonly detailsIdLabel: Locator;

  constructor(page: Page) {
    // Scoped to the results list: a lazily loaded route keeps the previous
    // page mounted for a moment, and the dashboard also renders transaction rows.
    this.results = qa(page, 'transactions-results');
    this.rows = qa(this.results, 'transaction-row');
    this.resultCount = qa(this.results, 'result-count');
    this.searchInput = qa(page, 'search-input');
    this.directionFilter = qa(page, 'direction-filter');
    this.categoryFilter = qa(page, 'category-filter');
    this.accountFilter = qa(page, 'account-filter');
    this.sortFilter = qa(page, 'sort-filter');
    this.clearFiltersButton = qa(page, 'clear-filters');
    this.emptyState = qa(page, 'transactions-empty');
    this.detailsDialog = qa(page, 'transaction-details');
    this.detailsId = qa(this.detailsDialog, 'transaction-id');
    this.detailsIdLabel = qa(this.detailsDialog, 'transaction-id-label');
  }

  async filterByDirection(direction: TransactionDirection): Promise<void> {
    await chooseOption(this.directionFilter, direction);
  }

  async search(term: string): Promise<void> {
    await this.searchInput.fill(term);
  }

  async clearFilters(): Promise<void> {
    await this.clearFiltersButton.click();
  }

  async openFirstDetails(): Promise<void> {
    await this.rows.first().click();
  }

  async closeDetails(): Promise<void> {
    await qa(this.detailsDialog, 'dialog-close').click();
  }
}
