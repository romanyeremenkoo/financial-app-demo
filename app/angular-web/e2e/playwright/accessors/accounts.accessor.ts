import { Locator, Page } from '@playwright/test';
import { qa } from './qa';

/** Accounts & cards page: account summaries and the freeze/unfreeze card tiles. */
export class AccountsAccessor {
  readonly heading: Locator;
  readonly accountCards: Locator;
  readonly cardTiles: Locator;

  constructor(page: Page) {
    this.heading = qa(page, 'accounts-heading');
    this.accountCards = qa(page, 'account-card');
    this.cardTiles = qa(page, 'card-tile');
  }

  cardTileAt(index: number): Locator {
    return this.cardTiles.nth(index);
  }

  freezeToggle(tile: Locator): Locator {
    return qa(tile, 'card-toggle');
  }

  statusChip(tile: Locator): Locator {
    return qa(tile, 'card-status');
  }

  frozenBadge(tile: Locator): Locator {
    return qa(tile, 'card-frozen-badge');
  }
}
