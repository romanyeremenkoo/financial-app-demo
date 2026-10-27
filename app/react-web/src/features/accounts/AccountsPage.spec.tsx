import { describe, expect, it } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import { DemoBankingDataSource } from '../../data/demo/demo.adapter';
import { renderPage } from '../../test/render';
import AccountsPage from './AccountsPage';

const qa = <T extends HTMLElement>(name: string): T | null =>
  document.querySelector<T>(`[data-qa="${name}"]`);

const tiles = (): HTMLElement[] =>
  Array.from(document.querySelectorAll<HTMLElement>('[data-qa="card-tile"]'));

const setup = () => {
  const dataSource = new DemoBankingDataSource(0);
  return renderPage(<AccountsPage />, '/accounts', { dataSource });
};

const waitForContent = async (): Promise<void> => {
  await waitFor(() => {
    expect(tiles().length).toBeGreaterThan(0);
  });
};

describe('AccountsPage', () => {
  it('renders the demo accounts and virtual cards', async () => {
    setup();
    await waitForContent();

    expect(document.querySelectorAll('[data-qa="account-card"]').length).toBeGreaterThanOrEqual(2);
    expect(tiles().length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText('Elena Vasquez').length).toBeGreaterThan(0);
  });

  it('masks card numbers so they cannot resemble payment credentials', async () => {
    setup();
    await waitForContent();

    const numbers = Array.from(document.querySelectorAll('.plastic__number')).map(
      (node) => node.textContent ?? '',
    );
    expect(numbers.length).toBeGreaterThan(0);
    for (const number of numbers) {
      expect(number.replace(/\D/g, '')).toHaveLength(4);
    }
  });

  it('requires confirmation before freezing a card', async () => {
    const { user, dataSource } = setup();
    await waitForContent();

    const tile = tiles()[0];
    if (tile === undefined) {
      throw new Error('expected a card tile');
    }
    const cardId = tile.dataset['cardId'];

    await user.click(within(tile).getByRole('button', { name: /freeze/i }));

    const dialog = await screen.findByRole('dialog');
    await user.click(within(dialog).getByRole('button', { name: 'Cancel' }));

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).toBeNull();
    });

    const snapshot = await dataSource.loadSnapshot();
    expect(snapshot.cards.find((card) => card.id === cardId)?.status).toBe('active');
  });

  it('freezes a card and reports the change', async () => {
    const { user, dataSource } = setup();
    await waitForContent();

    const tile = tiles()[0];
    if (tile === undefined) {
      throw new Error('expected a card tile');
    }
    const cardId = tile.dataset['cardId'];

    await user.click(within(tile).getByRole('button', { name: /freeze/i }));
    const dialog = await screen.findByRole('dialog');
    await user.click(
      qa<HTMLButtonElement>('dialog-confirm') ?? within(dialog).getAllByRole('button')[1]!,
    );

    await waitFor(() => {
      expect(qa('feedback-region')?.textContent ?? '').not.toBe('');
    });

    const snapshot = await dataSource.loadSnapshot();
    expect(snapshot.cards.find((card) => card.id === cardId)?.status).toBe('frozen');

    await waitFor(() => {
      expect(qa('card-frozen-badge')).not.toBeNull();
    });
  });
});
