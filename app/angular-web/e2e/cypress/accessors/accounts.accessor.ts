type Element = Cypress.Chainable<JQuery<HTMLElement>>;

/** Accounts & cards page: account summaries and the freeze/unfreeze card tiles. */
export class AccountsAccessor {
  readonly heading = (): Element => cy.qa('accounts-heading');

  readonly accountCards = (): Element => cy.qa('account-card');

  readonly cardTiles = (): Element => cy.qa('card-tile');

  readonly cardTileAt = (index: number): Element => this.cardTiles().eq(index);

  readonly freezeToggle = (index: number): Element => this.cardTileAt(index).qaIn('card-toggle');

  readonly statusChip = (index: number): Element => this.cardTileAt(index).qaIn('card-status');

  readonly frozenBadge = (index: number): Element =>
    this.cardTileAt(index).qaIn('card-frozen-badge');
}
