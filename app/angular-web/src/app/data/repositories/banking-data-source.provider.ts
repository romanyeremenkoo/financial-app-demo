import { EnvironmentProviders, Provider, makeEnvironmentProviders } from '@angular/core';
import { environment } from '../../../environments/environment';
import { DemoBankingDataSource } from '../demo/demo-banking.data-source';
import { HttpBankingDataSource } from '../http/http-banking.data-source';
import { BANKING_DATA_SOURCE } from './banking-data-source';

/**
 * Chooses the data adapter once, at the application boundary.
 *
 * Everything downstream — the store, the use cases and every component — only
 * ever sees `BANKING_DATA_SOURCE`, so no feature code has to know which mode
 * the application is running in.
 */
export const provideBankingDataSource = (): EnvironmentProviders => {
  const adapter: Provider =
    environment.dataMode === 'api'
      ? { provide: BANKING_DATA_SOURCE, useClass: HttpBankingDataSource }
      : { provide: BANKING_DATA_SOURCE, useClass: DemoBankingDataSource };

  return makeEnvironmentProviders([adapter]);
};
