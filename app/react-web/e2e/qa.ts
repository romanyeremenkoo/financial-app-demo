/**
 * The single attribute the end-to-end suite is allowed to query by.
 *
 * Classes belong to styling and visible text changes with the interface
 * language, so neither is a stable contract for a test. Every element a test
 * needs to reach carries an explicit `data-qa` hook instead.
 */
export const QA_ATTRIBUTE = 'data-qa';

/** Builds the attribute selector used by runners without a test-id helper. */
export const qaSelector = (id: string): string => `[${QA_ATTRIBUTE}="${id}"]`;
