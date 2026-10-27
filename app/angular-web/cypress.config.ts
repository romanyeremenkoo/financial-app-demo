import { defineConfig } from 'cypress';
import { QA_ATTRIBUTE } from './e2e/qa';

const PORT = 4280;
const VIEWPORT_WIDTH = 1440;
const VIEWPORT_HEIGHT = 900;

export default defineConfig({
  e2e: {
    baseUrl: `http://localhost:${PORT}`,
    specPattern: 'e2e/cypress/specs/**/*.cy.ts',
    supportFile: 'e2e/cypress/support/e2e.ts',
    fixturesFolder: false,
    screenshotsFolder: 'e2e/cypress/artifacts/screenshots',
    videosFolder: 'e2e/cypress/artifacts/videos',
    downloadsFolder: 'e2e/cypress/artifacts/downloads',
    video: false,
    retries: { runMode: 1, openMode: 0 },
  },
  viewportWidth: VIEWPORT_WIDTH,
  viewportHeight: VIEWPORT_HEIGHT,
  // Mirrors the Playwright `testIdAttribute`: both suites address the same hooks.
  env: { qaAttribute: QA_ATTRIBUTE },
});
