import type { Locator } from '@playwright/test';

/**
 * Picks a value from a `FinSelect`.
 *
 * The control is a custom listbox rather than a native `<select>`, so the
 * trigger has to be opened before the option can be clicked.
 */
export const chooseOption = async (trigger: Locator, value: string): Promise<void> => {
  await trigger.click();
  await trigger.locator('xpath=..').locator(`[role="option"][data-value="${value}"]`).click();
};
