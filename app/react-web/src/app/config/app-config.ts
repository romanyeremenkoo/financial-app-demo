/**
 * Runtime configuration derived from Vite environment variables.
 *
 * `VITE_*` values are inlined into the client bundle at build time, so this
 * module must only ever carry non-secret configuration.
 */

export const DATA_MODES = ['demo', 'api'] as const;

export type DataMode = (typeof DATA_MODES)[number];

/** Backend-independent demo is the safe default for every build. */
const DEFAULT_DATA_MODE: DataMode = 'demo';

const DEFAULT_API_BASE_URL = 'http://localhost:8080/api';

const isDataMode = (value: string): value is DataMode =>
  (DATA_MODES as readonly string[]).includes(value);

export interface AppConfig {
  readonly dataMode: DataMode;
  readonly apiBaseUrl: string;
}

const stripTrailingSlash = (url: string): string => url.replace(/\/+$/, '');

export const readAppConfig = (env: ImportMetaEnv): AppConfig => {
  const rawMode = (env.VITE_DATA_MODE ?? '').trim();
  const rawBaseUrl = (env.VITE_API_BASE_URL ?? '').trim();

  return {
    dataMode: isDataMode(rawMode) ? rawMode : DEFAULT_DATA_MODE,
    apiBaseUrl: stripTrailingSlash(rawBaseUrl === '' ? DEFAULT_API_BASE_URL : rawBaseUrl),
  };
};

export const appConfig: AppConfig = readAppConfig(import.meta.env);
