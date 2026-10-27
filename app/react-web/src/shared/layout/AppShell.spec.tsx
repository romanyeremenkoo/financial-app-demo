import { describe, expect, it, vi } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import { DemoBankingDataSource } from '../../data/demo/demo.adapter';
import {
  type BankingDataSource,
  type BankingSnapshot,
  DataSourceError,
} from '../../data/repositories/banking-data-source';
import DashboardPage from '../../features/dashboard/DashboardPage';
import { renderPage } from '../../test/render';

const qa = <T extends HTMLElement>(name: string): T | null =>
  document.querySelector<T>(`[data-qa="${name}"]`);

const setup = (dataSource: BankingDataSource = new DemoBankingDataSource(0)) =>
  renderPage(<DashboardPage />, '/dashboard', { dataSource });

/** Adapter that always fails the way an unreachable backend would. */
class UnavailableDataSource implements BankingDataSource {
  readonly mode = 'api' as const;
  readonly supportsReset = false;
  readonly loadSnapshot = vi.fn<() => Promise<BankingSnapshot>>(() =>
    Promise.reject(
      new DataSourceError('unavailable', 'API_UNAVAILABLE', 'Could not reach the banking API.'),
    ),
  );

  setCardStatus(): Promise<BankingSnapshot> {
    return this.loadSnapshot();
  }

  executeTransfer(): never {
    throw new DataSourceError('unavailable', 'API_UNAVAILABLE', 'unreachable');
  }

  resetDemoData(): Promise<BankingSnapshot> {
    return this.loadSnapshot();
  }
}

describe('AppShell', () => {
  it('loads the dataset once and renders the navigation', async () => {
    setup();

    await waitFor(() => {
      expect(qa('primary-nav')).not.toBeNull();
    });
    expect(within(qa('primary-nav') as HTMLElement).getAllByRole('link')).toHaveLength(5);
    expect(screen.getByText('Elena Vasquez')).toBeInTheDocument();
  });

  it('hides and restores every monetary value with the balance toggle', async () => {
    const { user } = setup();

    const balanceValue = async (): Promise<string> => {
      const node = await waitFor(() => {
        const found = document.querySelector('.balance-card__value');
        expect(found).not.toBeNull();
        return found as HTMLElement;
      });
      return node.textContent ?? '';
    };

    await waitFor(async () => {
      expect(await balanceValue()).toContain('€');
    });
    expect(await balanceValue()).not.toContain('••••');

    await user.click(qa<HTMLButtonElement>('balance-toggle') as HTMLButtonElement);

    await waitFor(async () => {
      expect(await balanceValue()).toContain('••••');
    });
    expect(qa('balance-toggle')?.getAttribute('aria-pressed')).toBe('true');

    await user.click(qa<HTMLButtonElement>('balance-toggle') as HTMLButtonElement);
    await waitFor(async () => {
      expect(await balanceValue()).not.toContain('••••');
    });
  });

  it('switches language at runtime and keeps the document lang in sync', async () => {
    const { user } = setup();

    await waitFor(() => {
      expect(qa('language-switch')).not.toBeNull();
    });
    expect(screen.getByText('Signed in as')).toBeInTheDocument();

    await user.click(qa<HTMLButtonElement>('language-ua') as HTMLButtonElement);

    await waitFor(() => {
      expect(document.documentElement.lang).toBe('uk');
    });
    expect(screen.queryByText('Signed in as')).toBeNull();
    expect(localStorage.getItem('financial-app.language')).toBe('ua');
  });

  it('explains a failed load and retries instead of falling back to demo data', async () => {
    const dataSource = new UnavailableDataSource();
    const { user } = setup(dataSource);

    await waitFor(() => {
      expect(qa('load-error')).not.toBeNull();
    });
    expect(qa('load-error')?.textContent).toContain('Try again');
    expect(document.querySelector('[data-qa="account-card"]')).toBeNull();

    await user.click(qa<HTMLButtonElement>('load-retry') as HTMLButtonElement);

    await waitFor(() => {
      expect(dataSource.loadSnapshot).toHaveBeenCalledTimes(2);
    });
    expect(qa('load-error')).not.toBeNull();
  });

  it('restores the seed dataset through the confirmed reset action', async () => {
    const dataSource = new DemoBankingDataSource(0);
    await dataSource.executeTransfer(
      {
        sourceAccountId: 'acc-current',
        destinationAccountId: 'acc-savings',
        amountMinor: 1000,
        currency: 'EUR',
      },
      'req-before-reset',
    );

    const { user } = setup(dataSource);

    await waitFor(() => {
      expect(qa('reset-demo')).not.toBeNull();
    });

    await user.click(qa<HTMLButtonElement>('reset-demo') as HTMLButtonElement);
    const dialog = await screen.findByRole('dialog');
    await user.click(within(dialog).getByRole('button', { name: 'Reset demo data' }));

    await waitFor(() => {
      expect(qa('feedback-region')?.textContent ?? '').toContain('restored');
    });
    expect((await dataSource.loadSnapshot()).transfers).toHaveLength(0);
  });
});
