import { Provider } from '@angular/core';
import { BANKING_DATA_SOURCE } from '../app/data/repositories/banking-data-source';
import { DemoBankingDataSource } from '../app/data/demo/demo-banking.data-source';

/**
 * Wires the browser-local adapter for tests.
 *
 * Specs exercise the same adapter the deployed demo uses, so the business
 * rules under test are the real ones rather than a test-only imitation.
 */
export const provideTestDataSource = (): Provider[] => [
  DemoBankingDataSource,
  // Aliased rather than re-instantiated, so a spec can reach the same instance.
  { provide: BANKING_DATA_SOURCE, useExisting: DemoBankingDataSource },
];
