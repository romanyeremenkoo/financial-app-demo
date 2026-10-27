/**
 * Shape of the build-time configuration shared by every environment file.
 *
 * It lives outside `environment.ts` because `angular.json` swaps that file out
 * per configuration, so a replacement file cannot import a type from it.
 */
export interface AppEnvironment {
  readonly production: boolean;
  /** `demo` keeps everything in the browser; `api` talks to the Spring Boot service. */
  readonly dataMode: 'demo' | 'api';
  /** Only meaningful in `api` mode. Never put a secret here: it ships to the browser. */
  readonly apiBaseUrl: string;
}
