import { describe, expect, it } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import { DemoBankingDataSource } from '../../data/demo/demo.adapter';
import { renderPage } from '../../test/render';
import { chooseOption } from '../../test/select';
import TransfersPage from './TransfersPage';

const setup = () => {
  const dataSource = new DemoBankingDataSource(0);
  return renderPage(<TransfersPage />, '/transfers', { dataSource });
};

const qa = <T extends HTMLElement>(name: string): T =>
  document.querySelector<T>(`[data-qa="${name}"]`) as T;

const qaAll = (name: string): HTMLElement[] =>
  Array.from(document.querySelectorAll<HTMLElement>(`[data-qa="${name}"]`));

describe('TransfersPage', () => {
  it('walks the full details → review → confirm → receipt journey', async () => {
    const { user, dataSource } = setup();

    await waitFor(() => {
      expect(qa('source-account')).not.toBeNull();
    });

    await chooseOption(user, 'source-account', 'acc-current');
    await chooseOption(user, 'destination-account', 'acc-savings');
    await user.type(qa<HTMLInputElement>('transfer-amount'), '125.50');
    await user.type(qa<HTMLInputElement>('transfer-reference'), 'Monthly savings');

    const review = qa<HTMLButtonElement>('continue-to-review');
    await waitFor(() => {
      expect(review).toBeEnabled();
    });
    await user.click(review);

    expect(await screen.findByText('Review your transfer')).toBeInTheDocument();
    expect(screen.getByText('€125.50')).toBeInTheDocument();
    expect(screen.getByText('Monthly savings')).toBeInTheDocument();

    await user.click(qa<HTMLButtonElement>('confirm-transfer'));

    await waitFor(() => {
      expect(qa('transfer-receipt')).not.toBeNull();
    });
    expect(within(qa('transfer-receipt')).getByText('Transfer completed')).toBeInTheDocument();

    const snapshot = await dataSource.loadSnapshot();
    expect(snapshot.transfers).toHaveLength(1);
    expect(snapshot.transfers[0]?.amountMinor).toBe(12_550);
  });

  it('blocks the review step until the draft is valid', async () => {
    const { user } = setup();

    await waitFor(() => {
      expect(qa('source-account')).not.toBeNull();
    });

    expect(qa<HTMLButtonElement>('continue-to-review')).toBeDisabled();

    await chooseOption(user, 'source-account', 'acc-current');
    await chooseOption(user, 'destination-account', 'acc-savings');
    await user.type(qa<HTMLInputElement>('transfer-amount'), '0');

    await waitFor(() => {
      expect(qa<HTMLButtonElement>('continue-to-review')).toBeDisabled();
    });
  });

  it('shows a field error for an amount above the available balance', async () => {
    const { user } = setup();

    await waitFor(() => {
      expect(qa('source-account')).not.toBeNull();
    });

    await chooseOption(user, 'source-account', 'acc-current');
    await chooseOption(user, 'destination-account', 'acc-savings');
    await user.type(qa<HTMLInputElement>('transfer-amount'), '9999999');
    await user.tab();

    await waitFor(() => {
      expect(qa('error-amount')?.textContent).toContain('available funds');
    });
  });

  it('rejects more decimals than the currency allows', async () => {
    const { user } = setup();

    await waitFor(() => {
      expect(qa('source-account')).not.toBeNull();
    });

    await user.type(qa<HTMLInputElement>('transfer-amount'), '10.123');
    await user.tab();

    await waitFor(() => {
      expect(qa('error-amount')).not.toBeNull();
    });
  });

  it('excludes the selected source from the destination options', async () => {
    const { user } = setup();

    await waitFor(() => {
      expect(qa('source-account')).not.toBeNull();
    });

    await chooseOption(user, 'source-account', 'acc-current');

    await user.click(qa('destination-account'));
    const options = Array.from(
      document.querySelectorAll<HTMLElement>('[data-qa="destination-account-option"]'),
    ).map((option) => option.dataset['value']);
    expect(options).not.toContain('acc-current');
  });

  it('does not settle twice when confirm is clicked repeatedly', async () => {
    const { user, dataSource } = setup();

    await waitFor(() => {
      expect(qa('source-account')).not.toBeNull();
    });

    await chooseOption(user, 'source-account', 'acc-current');
    await chooseOption(user, 'destination-account', 'acc-savings');
    await user.type(qa<HTMLInputElement>('transfer-amount'), '10');
    await waitFor(() => {
      expect(qa<HTMLButtonElement>('continue-to-review')).toBeEnabled();
    });
    await user.click(qa<HTMLButtonElement>('continue-to-review'));

    const confirm = await waitFor(() => qa<HTMLButtonElement>('confirm-transfer'));
    await user.dblClick(confirm);

    await waitFor(() => {
      expect(qa('transfer-receipt')).not.toBeNull();
    });

    const snapshot = await dataSource.loadSnapshot();
    expect(snapshot.transfers).toHaveLength(1);
  });

  it('returns to the form without settling when the user goes back', async () => {
    const { user, dataSource } = setup();

    await waitFor(() => {
      expect(qa('source-account')).not.toBeNull();
    });

    await chooseOption(user, 'source-account', 'acc-current');
    await chooseOption(user, 'destination-account', 'acc-savings');
    await user.type(qa<HTMLInputElement>('transfer-amount'), '10');
    await waitFor(() => {
      expect(qa<HTMLButtonElement>('continue-to-review')).toBeEnabled();
    });
    await user.click(qa<HTMLButtonElement>('continue-to-review'));

    await screen.findByText('Review your transfer');
    await user.click(screen.getByRole('button', { name: 'Back' }));

    await waitFor(() => {
      expect(qa('source-account')).not.toBeNull();
    });
    expect((await dataSource.loadSnapshot()).transfers).toHaveLength(0);
  });

  it('marks the active step for assistive technology', async () => {
    setup();

    await waitFor(() => {
      expect(qa('source-account')).not.toBeNull();
    });

    const steps = qaAll('source-account');
    expect(steps).toHaveLength(1);
    const current = document.querySelector('[aria-current="step"]');
    expect(current?.textContent).toContain('Details');
  });
});
