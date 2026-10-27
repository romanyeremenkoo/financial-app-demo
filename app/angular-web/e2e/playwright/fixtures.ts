import { test as base } from '@playwright/test';
import { AccountsAccessor } from './accessors/accounts.accessor';
import { AppAccessor } from './accessors/app.accessor';
import { TransactionsAccessor } from './accessors/transactions.accessor';
import { TransfersAccessor } from './accessors/transfers.accessor';

interface Accessors {
  app: AppAccessor;
  accounts: AccountsAccessor;
  transactions: TransactionsAccessor;
  transfers: TransfersAccessor;
}

/**
 * Every accessor is injected as a Playwright fixture, so specs describe user
 * intent and never build locators themselves.
 */
export const test = base.extend<Accessors>({
  app: async ({ page }, use) => {
    await use(new AppAccessor(page));
  },
  accounts: async ({ page }, use) => {
    await use(new AccountsAccessor(page));
  },
  transactions: async ({ page }, use) => {
    await use(new TransactionsAccessor(page));
  },
  transfers: async ({ page }, use) => {
    await use(new TransfersAccessor(page));
  },
});

export { expect } from '@playwright/test';
