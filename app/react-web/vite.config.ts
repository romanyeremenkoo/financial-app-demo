import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

/**
 * Dev server ports are deliberately distinct from the Angular frontend
 * (4200 / 4280) so both applications can run side by side.
 */
const DEV_PORT = 5173;

/**
 * The charting library is the single large chunk. It is only pulled in by the
 * lazily loaded analytics and dashboard charts, so it never affects the
 * initial payload and the default 500 kB warning is noise here.
 */
const CHUNK_SIZE_WARNING_LIMIT_KB = 700;

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: { port: DEV_PORT },
  preview: { port: DEV_PORT },
  build: {
    outDir: 'dist',
    sourcemap: false,
    chunkSizeWarningLimit: CHUNK_SIZE_WARNING_LIMIT_KB,
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
    include: ['src/**/*.spec.{ts,tsx}'],
    css: false,
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/**/*.spec.{ts,tsx}', 'src/main.tsx', 'src/**/*.d.ts'],
    },
  },
});
