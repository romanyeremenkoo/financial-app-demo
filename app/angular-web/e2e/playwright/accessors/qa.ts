import { Locator, Page } from '@playwright/test';
import { QA_ATTRIBUTE } from '../../qa';

export { QA_ATTRIBUTE };

/**
 * Resolves an element by its `data-qa` value. `playwright.config.ts` points
 * `testIdAttribute` at the same constant, so `getByTestId` reads the attribute
 * this project standardised on.
 */
export const qa = (scope: Page | Locator, id: string): Locator => scope.getByTestId(id);
