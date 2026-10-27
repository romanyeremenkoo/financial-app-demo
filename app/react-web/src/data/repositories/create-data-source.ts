import { type AppConfig, appConfig } from '../../app/config/app-config';
import { DemoBankingDataSource } from '../demo/demo.adapter';
import { HttpBankingDataSource } from '../http/http.adapter';
import type { BankingDataSource } from './banking-data-source';

/**
 * The single place where the operating mode selects an implementation.
 *
 * Everything above this line talks to `BankingDataSource` only, so no feature
 * component or hook ever branches on the mode.
 */
export const createBankingDataSource = (config: AppConfig = appConfig): BankingDataSource => {
  switch (config.dataMode) {
    case 'api':
      return new HttpBankingDataSource(config.apiBaseUrl);
    case 'demo':
      return new DemoBankingDataSource();
  }
};
