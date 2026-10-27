import { AppEnvironment } from './app-environment';

/**
 * Runtime configuration for the Angular frontend.
 *
 * This file is the default and therefore the configuration every production
 * build uses: the public demo must work without a backend. The `api`
 * configuration in `angular.json` replaces it with `environment.api.ts`.
 */
export const environment: AppEnvironment = {
  production: true,
  dataMode: 'demo',
  apiBaseUrl: '',
};
