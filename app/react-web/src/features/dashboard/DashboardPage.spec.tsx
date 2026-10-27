import { describe, expect, it } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { DemoBankingDataSource } from '../../data/demo/demo.adapter';
import { totalBalance } from '../../domain/analytics/analytics';
import { formatMoney } from '../../domain/money/money';
import { renderPage } from '../../test/render';
import DashboardPage from './DashboardPage';

const setup = () => {
  const dataSource = new DemoBankingDataSource(0);
  return renderPage(<DashboardPage />, '/dashboard', { dataSource });
};

describe('DashboardPage', () => {
  it('derives the total balance from the same accounts it lists', async () => {
    const { dataSource } = setup();
    const snapshot = await dataSource.loadSnapshot();
    const expected = formatMoney(totalBalance(snapshot.accounts, 'EUR'), { locale: 'en-IE' });

    await waitFor(() => {
      expect(document.querySelectorAll('[data-qa="account-card"]').length).toBe(
        snapshot.accounts.length,
      );
    });

    expect(screen.getAllByText(expected).length).toBeGreaterThanOrEqual(2);
  });

  it('renders the recent transactions, the category breakdown and quick actions', async () => {
    setup();

    await waitFor(() => {
      expect(document.querySelectorAll('[data-qa="transaction-row"]').length).toBeGreaterThan(0);
    });

    expect(document.querySelector('[data-qa="spending-donut"]')).not.toBeNull();
    expect(screen.getByRole('link', { name: /move money/i })).toHaveAttribute('href', '/transfers');
    expect(screen.getByRole('link', { name: /transaction history/i })).toHaveAttribute(
      'href',
      '/transactions',
    );
  });

  it('shows skeleton placeholders before the data arrives', () => {
    renderPage(<DashboardPage />, '/dashboard', {
      dataSource: new DemoBankingDataSource(50),
    });

    expect(document.querySelectorAll('.skeleton').length).toBeGreaterThan(0);
  });
});
