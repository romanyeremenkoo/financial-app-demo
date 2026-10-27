import { AppEnvironment } from './app-environment';

/**
 * Local development against the shared Spring Boot API.
 *
 * Selected by `npm run start:api` / `npm run build:api`, which activate the
 * `api` build configuration and file-replace `environment.ts` with this file.
 */
export const environment: AppEnvironment = {
  production: false,
  dataMode: 'api',
  apiBaseUrl: 'http://localhost:8080/api',
};
