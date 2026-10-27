import { EN_TRANSLATIONS } from '../../../src/app/core/i18n/translations/en';
import { UA_TRANSLATIONS } from '../../../src/app/core/i18n/translations/ua';
import { AccountsAccessor } from '../accessors/accounts.accessor';
import { AppAccessor } from '../accessors/app.accessor';
import { TransactionsAccessor } from '../accessors/transactions.accessor';
import { TransfersAccessor } from '../accessors/transfers.accessor';

const SEEDED_ACCOUNT_COUNT = 3;
const TRANSFER_REFERENCE = 'Cypress rent top-up';
const SETTLEMENT_TIMEOUT_MS = 10_000;
const TRANSFER_LEG_COUNT = 2;
const FIRST_CARD = 0;

const countLabel = (total: number): string =>
  EN_TRANSLATIONS.transactions.count.replace('{{ count }}', String(total));

const app = new AppAccessor();
const accounts = new AccountsAccessor();
const transactions = new TransactionsAccessor();
const transfers = new TransfersAccessor();

describe('Financial App demo [cypress]', () => {
  it('demo entry unlocks the dashboard and guards the product routes', () => {
    app.goto('/transactions');
    cy.url().should('match', /\/welcome$/);
    app.enterDemoButton().should('be.visible').click();
    cy.url().should('match', /\/dashboard$/);

    app.navigateTo('accounts');
    accounts.heading().shouldHaveTrimmedText(EN_TRANSLATIONS.accounts.yourAccounts);
    accounts.accountCards().should('have.length', SEEDED_ACCOUNT_COUNT);
  });

  it('transactions can be filtered and cleared', () => {
    app.enterDemo();
    app.navigateTo('transactions');
    cy.url().should('match', /\/transactions$/);

    transactions.rows().should('have.length.greaterThan', 0);
    transactions.rows().then(($rows) => {
      const total = $rows.length;
      transactions.resultCount().shouldHaveTrimmedText(countLabel(total));

      transactions.filterByDirection('credit');
      transactions
        .rows()
        .should('have.length.lessThan', total)
        .and('have.length.greaterThan', 0)
        .then(($incoming) => {
          transactions.resultCount().shouldHaveTrimmedText(countLabel($incoming.length));
        });

      transactions.search('zzzz-no-such-merchant');
      transactions.emptyState().should('be.visible');

      transactions.clearFilters();
      transactions.resultCount().shouldHaveTrimmedText(countLabel(total));
      transactions.rows().should('have.length', total);
    });

    transactions.openFirstDetails();
    // The dialog host renders with `display: contents`, so existence is the
    // meaningful check and visibility is asserted on its content.
    transactions.detailsDialog().should('exist');
    transactions
      .detailsIdLabel()
      .should('be.visible')
      .shouldHaveTrimmedText(EN_TRANSLATIONS.transactions.details.id);
    transactions.detailsId().should('not.be.empty');
    transactions.closeDetails();
    transactions.detailsDialog().should('not.exist');
  });

  it('a valid internal transfer completes and updates the ledger', () => {
    app.enterDemo();
    app.navigateTo('transfers');

    transfers.fillDraft({
      sourceAccountId: 'acc-savings',
      destinationAccountId: 'acc-current',
      amount: '150.00',
      reference: TRANSFER_REFERENCE,
    });

    transfers.continueToReview();
    transfers.reviewHeading().shouldHaveTrimmedText(EN_TRANSLATIONS.transfers.reviewTitle);

    transfers.confirmTransfer();
    transfers
      .receipt({ timeout: SETTLEMENT_TIMEOUT_MS })
      .should('be.visible')
      .and('contain.text', EN_TRANSLATIONS.transfers.receiptTitle)
      .and('contain.text', TRANSFER_REFERENCE);

    transfers.openTransactionsFromReceipt();
    cy.url().should('match', /\/transactions$/);
    transactions.search(TRANSFER_REFERENCE);
    transactions.rows().should('have.length', TRANSFER_LEG_COUNT);
  });

  it('an invalid transfer is blocked before any money moves', () => {
    app.enterDemo();
    app.navigateTo('transfers');

    transfers.continueToReviewButton().should('be.disabled');

    transfers.fillDraft({
      sourceAccountId: 'acc-joint',
      destinationAccountId: 'acc-current',
      amount: '999999.00',
    });
    transfers.amount().blur();

    transfers
      .fieldError('amount')
      .shouldHaveTrimmedText(EN_TRANSLATIONS.transferError.INSUFFICIENT_FUNDS);
    transfers.continueToReviewButton().should('be.disabled');

    transfers.commitAmount('10.123');
    transfers
      .fieldError('amount')
      .shouldHaveTrimmedText(EN_TRANSLATIONS.transferError.AMOUNT_PRECISION);
    transfers.continueToReviewButton().should('be.disabled');

    // A valid amount re-enables the flow, proving the block was the rule, not the form.
    transfers.commitAmount('10.00');
    transfers.continueToReviewButton().should('be.enabled');
  });

  it('a card can be frozen and unfrozen with confirmation', () => {
    app.enterDemo();
    app.navigateTo('accounts');
    cy.url().should('match', /\/accounts$/);

    accounts.freezeToggle(FIRST_CARD).shouldHaveTrimmedText(EN_TRANSLATIONS.card.freeze).click();
    app.confirmDialog().should('exist');
    app
      .confirmDialogTitle()
      .should('be.visible')
      .shouldHaveTrimmedText(EN_TRANSLATIONS.card.freezeTitle);

    app.cancel();
    accounts.freezeToggle(FIRST_CARD).shouldHaveTrimmedText(EN_TRANSLATIONS.card.freeze);
    accounts.frozenBadge(FIRST_CARD).should('not.exist');

    accounts.freezeToggle(FIRST_CARD).click();
    app.confirm();
    accounts.freezeToggle(FIRST_CARD).shouldHaveTrimmedText(EN_TRANSLATIONS.card.unfreeze);
    accounts.frozenBadge(FIRST_CARD).should('be.visible');
    accounts.statusChip(FIRST_CARD).shouldHaveTrimmedText(EN_TRANSLATIONS.cardStatus.frozen);

    accounts.freezeToggle(FIRST_CARD).click();
    app.confirm();
    accounts.freezeToggle(FIRST_CARD).shouldHaveTrimmedText(EN_TRANSLATIONS.card.freeze);
    accounts.frozenBadge(FIRST_CARD).should('not.exist');
  });

  it('the interface can be switched to Ukrainian and back', () => {
    app.enterDemo();
    app.navigateTo('accounts');

    accounts.heading().shouldHaveTrimmedText(EN_TRANSLATIONS.accounts.yourAccounts);

    app.switchLanguage('ua');
    accounts.heading().shouldHaveTrimmedText(UA_TRANSLATIONS.accounts.yourAccounts);
    app.navLink('transfers').should('contain.text', UA_TRANSLATIONS.nav.transfers);

    // The choice survives a reload because it is persisted per browser.
    cy.reload();
    accounts.heading().shouldHaveTrimmedText(UA_TRANSLATIONS.accounts.yourAccounts);

    app.switchLanguage('en');
    accounts.heading().shouldHaveTrimmedText(EN_TRANSLATIONS.accounts.yourAccounts);
  });
});
