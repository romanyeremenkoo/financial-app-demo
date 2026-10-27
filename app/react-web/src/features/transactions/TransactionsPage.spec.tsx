import { describe, expect, it } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import { DemoBankingDataSource } from '../../data/demo/demo.adapter';
import { renderPage } from '../../test/render';
import { chooseOption } from '../../test/select';
import TransactionsPage from './TransactionsPage';

const qa = <T extends HTMLElement>(name: string): T | null =>
  document.querySelector<T>(`[data-qa="${name}"]`);

const rows = (): HTMLElement[] =>
  Array.from(document.querySelectorAll<HTMLElement>('[data-qa="transaction-row"]'));

const setup = () =>
  renderPage(<TransactionsPage />, '/transactions', {
    dataSource: new DemoBankingDataSource(0),
  });

const waitForRows = async (): Promise<void> => {
  await waitFor(() => {
    expect(rows().length).toBeGreaterThan(0);
  });
};

describe('TransactionsPage', () => {
  it('lists the seeded history grouped by day with a result count', async () => {
    setup();
    await waitForRows();

    expect(qa('result-count')?.textContent).toMatch(/\d+/);
    expect(document.querySelectorAll('.group').length).toBeGreaterThan(0);
  });

  it('filters by direction', async () => {
    const { user } = setup();
    await waitForRows();

    const before = rows().length;
    await chooseOption(user, 'direction-filter', 'credit');

    await waitFor(() => {
      expect(rows().length).toBeLessThan(before);
    });
    expect(rows().length).toBeGreaterThan(0);
  });

  it('filters by account', async () => {
    const { user } = setup();
    await waitForRows();

    const before = rows().length;
    await chooseOption(user, 'account-filter', 'acc-savings');

    await waitFor(() => {
      expect(rows().length).toBeLessThan(before);
    });
  });

  it('shows an empty state and clears filters again', async () => {
    const { user } = setup();
    await waitForRows();

    await user.type(
      qa<HTMLInputElement>('search-input') as HTMLInputElement,
      'definitely-not-a-merchant',
    );

    await waitFor(() => {
      expect(qa('transactions-empty')).not.toBeNull();
    });

    await user.click(screen.getByRole('button', { name: 'Clear all filters' }));

    await waitForRows();
    expect(qa('transactions-empty')).toBeNull();
  });

  it('reorders the list when the sort changes', async () => {
    const { user } = setup();
    await waitForRows();

    const firstByDate = rows()[0]?.textContent;
    await chooseOption(user, 'sort-filter', 'date-asc');

    await waitFor(() => {
      expect(rows()[0]?.textContent).not.toBe(firstByDate);
    });
  });

  it('opens the details dialog with a stable transaction id and closes it', async () => {
    const { user } = setup();
    await waitForRows();

    const first = rows()[0];
    if (first === undefined) {
      throw new Error('expected at least one row');
    }
    await user.click(first);

    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText('Transaction ID')).toBeInTheDocument();
    expect(qa('transaction-id')?.textContent?.length).toBeGreaterThan(0);

    await user.click(within(dialog).getByRole('button', { name: /close/i }));

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).toBeNull();
    });
  });

  it('only offers the clear-filters shortcut while a filter is active', async () => {
    const { user } = setup();
    await waitForRows();

    expect(qa('clear-filters')).toBeNull();

    await chooseOption(user, 'direction-filter', 'debit');

    await waitFor(() => {
      expect(qa('clear-filters')).not.toBeNull();
    });

    await user.click(qa<HTMLButtonElement>('clear-filters') as HTMLButtonElement);

    await waitFor(() => {
      expect(qa('clear-filters')).toBeNull();
    });
  });
});
