import { EN_TRANSLATIONS } from '../../src/i18n/en';
import { UA_TRANSLATIONS } from '../../src/i18n/ua';
import { expect, test } from './fixtures';

const SEEDED_ACCOUNT_COUNT = 3;
const TRANSFER_REFERENCE = 'E2E rent top-up';
const SETTLEMENT_TIMEOUT_MS = 10_000;
const TRANSFER_LEG_COUNT = 2;
const FIRST_CARD = 0;

const countLabel = (total: number): string =>
  EN_TRANSLATIONS.transactions.count.replace('{{ count }}', String(total));

test.describe('Financial App demo [playwright]', () => {
  test('demo entry unlocks the dashboard and guards the product routes', async ({
    page,
    app,
    accounts,
  }) => {
    await app.goto('/transactions');
    await expect(page).toHaveURL(/\/welcome$/);
    await expect(app.enterDemoButton).toBeVisible();

    await app.enterDemoButton.click();
    await expect(page).toHaveURL(/\/dashboard$/);

    await app.navigateTo('accounts');
    await expect(accounts.heading).toHaveText(EN_TRANSLATIONS.accounts.yourAccounts);
    await expect(accounts.accountCards).toHaveCount(SEEDED_ACCOUNT_COUNT);
  });

  test('transactions can be filtered and cleared', async ({ page, app, transactions }) => {
    await app.enterDemo();
    await app.navigateTo('transactions');
    await expect(page).toHaveURL(/\/transactions$/);

    await expect(transactions.resultCount).toBeVisible();
    await expect(transactions.rows.first()).toBeVisible();
    const total = await transactions.rows.count();
    expect(total).toBeGreaterThan(0);
    await expect(transactions.resultCount).toHaveText(countLabel(total));

    await transactions.filterByDirection('credit');
    await expect(transactions.resultCount).not.toHaveText(countLabel(total));
    const incomingOnly = await transactions.rows.count();
    expect(incomingOnly).toBeGreaterThan(0);
    expect(incomingOnly).toBeLessThan(total);

    await transactions.search('zzzz-no-such-merchant');
    await expect(transactions.emptyState).toBeVisible();

    await transactions.clearFilters();
    await expect(transactions.resultCount).toHaveText(countLabel(total));
    await expect(transactions.rows).toHaveCount(total);

    await transactions.openFirstDetails();
    await expect(transactions.detailsDialog).toBeVisible();
    await expect(transactions.detailsIdLabel).toHaveText(EN_TRANSLATIONS.transactions.details.id);
    await expect(transactions.detailsId).not.toBeEmpty();
    await transactions.closeDetails();
    await expect(transactions.detailsDialog).toBeHidden();
  });

  test('a valid internal transfer completes and updates the ledger', async ({
    page,
    app,
    transactions,
    transfers,
  }) => {
    await app.enterDemo();
    await app.navigateTo('transfers');

    await transfers.fillDraft({
      sourceAccountId: 'acc-savings',
      destinationAccountId: 'acc-current',
      amount: '150.00',
      reference: TRANSFER_REFERENCE,
    });

    await transfers.continueToReview();
    await expect(transfers.reviewHeading).toHaveText(EN_TRANSLATIONS.transfers.reviewTitle);

    await transfers.confirmTransfer();
    await expect(transfers.receipt).toBeVisible({ timeout: SETTLEMENT_TIMEOUT_MS });
    await expect(transfers.receipt).toContainText(EN_TRANSLATIONS.transfers.receiptTitle);
    await expect(transfers.receipt).toContainText(TRANSFER_REFERENCE);

    await transfers.openTransactionsFromReceipt();
    await expect(page).toHaveURL(/\/transactions$/);
    await transactions.search(TRANSFER_REFERENCE);
    await expect(transactions.rows).toHaveCount(TRANSFER_LEG_COUNT);
  });

  test('an invalid transfer is blocked before any money moves', async ({ app, transfers }) => {
    await app.enterDemo();
    await app.navigateTo('transfers');

    await expect(transfers.continueToReviewButton).toBeDisabled();

    await transfers.fillDraft({
      sourceAccountId: 'acc-joint',
      destinationAccountId: 'acc-current',
      amount: '999999.00',
    });
    await transfers.amount.blur();

    await expect(transfers.fieldError('amount')).toHaveText(
      EN_TRANSLATIONS.transferError.INSUFFICIENT_FUNDS,
    );
    await expect(transfers.continueToReviewButton).toBeDisabled();

    await transfers.commitAmount('10.123');
    await expect(transfers.fieldError('amount')).toHaveText(
      EN_TRANSLATIONS.transferError.AMOUNT_PRECISION,
    );
    await expect(transfers.continueToReviewButton).toBeDisabled();

    // A valid amount re-enables the flow, proving the block was the rule, not the form.
    await transfers.commitAmount('10.00');
    await expect(transfers.continueToReviewButton).toBeEnabled();
  });

  test('a card can be frozen and unfrozen with confirmation', async ({ page, app, accounts }) => {
    await app.enterDemo();
    await app.navigateTo('accounts');
    await expect(page).toHaveURL(/\/accounts$/);

    const tile = accounts.cardTileAt(FIRST_CARD);
    const toggle = accounts.freezeToggle(tile);
    await expect(toggle).toHaveText(EN_TRANSLATIONS.card.freeze);

    await toggle.click();
    await expect(app.confirmDialog).toBeVisible();
    await expect(app.confirmDialogTitle).toHaveText(EN_TRANSLATIONS.card.freezeTitle);

    await app.cancel();
    await expect(toggle).toHaveText(EN_TRANSLATIONS.card.freeze);
    await expect(accounts.frozenBadge(tile)).toBeHidden();

    await toggle.click();
    await app.confirm();
    await expect(toggle).toHaveText(EN_TRANSLATIONS.card.unfreeze);
    await expect(accounts.frozenBadge(tile)).toBeVisible();
    await expect(accounts.statusChip(tile)).toHaveText(EN_TRANSLATIONS.cardStatus.frozen);

    await toggle.click();
    await app.confirm();
    await expect(toggle).toHaveText(EN_TRANSLATIONS.card.freeze);
    await expect(accounts.frozenBadge(tile)).toBeHidden();
  });

  test('demo changes survive a reload and are undone by the reset action', async ({
    page,
    app,
    accounts,
  }) => {
    await app.enterDemo();
    await app.navigateTo('accounts');

    const tile = accounts.cardTileAt(FIRST_CARD);
    await accounts.freezeToggle(tile).click();
    await app.confirm();
    await expect(accounts.frozenBadge(tile)).toBeVisible();

    // Demo state lives in localStorage, so a refresh must not lose the change.
    await page.reload();
    await expect(accounts.frozenBadge(accounts.cardTileAt(FIRST_CARD))).toBeVisible();

    await app.resetDemo();
    await expect(accounts.frozenBadge(accounts.cardTileAt(FIRST_CARD))).toBeHidden();
  });

  test('the interface can be switched to Ukrainian and back', async ({ app, accounts, page }) => {
    await app.enterDemo();
    await app.navigateTo('accounts');

    await expect(accounts.heading).toHaveText(EN_TRANSLATIONS.accounts.yourAccounts);

    await app.switchLanguage('ua');
    await expect(accounts.heading).toHaveText(UA_TRANSLATIONS.accounts.yourAccounts);
    await expect(app.navLink('transfers')).toContainText(UA_TRANSLATIONS.nav.transfers);
    await expect(page).toHaveTitle(UA_TRANSLATIONS.documentTitle.accounts);

    // The choice survives a reload because it is persisted per browser.
    await page.reload();
    await expect(accounts.heading).toHaveText(UA_TRANSLATIONS.accounts.yourAccounts);

    await app.switchLanguage('en');
    await expect(accounts.heading).toHaveText(EN_TRANSLATIONS.accounts.yourAccounts);
  });
});
