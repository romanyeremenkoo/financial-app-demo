import type { ReactElement, ReactNode } from 'react';
import { type RenderResult, render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router';
import { BankingProvider } from '../application/state/BankingProvider';
import { DemoSessionProvider } from '../app/providers/DemoSessionProvider';
import { FeedbackProvider } from '../app/providers/FeedbackProvider';
import { LanguageProvider } from '../app/providers/LanguageProvider';
import { DemoBankingDataSource } from '../data/demo/demo.adapter';
import type { BankingDataSource } from '../data/repositories/banking-data-source';
import { createI18n } from '../i18n/i18n';
import { AppShell } from '../shared/layout/AppShell';

export interface RenderOptions {
  /** Defaults to a zero-latency demo adapter so tests stay fast. */
  readonly dataSource?: BankingDataSource;
  readonly route?: string;
  readonly language?: 'en' | 'ua';
}

export type RenderedApp = RenderResult & {
  readonly user: ReturnType<typeof userEvent.setup>;
  readonly dataSource: BankingDataSource;
};

/**
 * Renders a tree inside the real application providers.
 *
 * Tests exercise the same wiring the browser uses; only the data adapter and
 * the initial route are swapped, which keeps the assertions meaningful.
 */
export const renderWithProviders = (ui: ReactElement, options: RenderOptions = {}): RenderedApp => {
  const { dataSource = new DemoBankingDataSource(0), route = '/', language = 'en' } = options;
  const i18n = createI18n(language);

  const wrapper = ({ children }: { readonly children: ReactNode }) => (
    <MemoryRouter initialEntries={[route]}>
      <LanguageProvider instance={i18n}>
        <FeedbackProvider>
          <DemoSessionProvider>
            <BankingProvider dataSource={dataSource}>{children}</BankingProvider>
          </DemoSessionProvider>
        </FeedbackProvider>
      </LanguageProvider>
    </MemoryRouter>
  );

  return Object.assign(render(ui, { wrapper }), {
    user: userEvent.setup(),
    dataSource,
  });
};

/** Marks the demo session as entered before the guarded routes render. */
export const enterDemoSession = (): void => {
  sessionStorage.setItem('financial-app.demo-session', 'true');
};

/**
 * Renders a feature page inside the real application shell.
 *
 * The shell owns the one-time dataset load, so mounting a page without it
 * would leave the store permanently in its loading state.
 */
export const renderPage = (
  page: ReactElement,
  path: string,
  options: RenderOptions = {},
): RenderedApp => {
  enterDemoSession();
  return renderWithProviders(
    <Routes>
      <Route element={<AppShell />}>
        <Route path={path} element={page} />
      </Route>
    </Routes>,
    { ...options, route: path },
  );
};
