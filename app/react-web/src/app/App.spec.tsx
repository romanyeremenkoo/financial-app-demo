import { describe, expect, it } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { DemoBankingDataSource } from '../data/demo/demo.adapter';
import { renderWithProviders } from '../test/render';
import { App } from './App';

const qa = <T extends HTMLElement>(name: string): T | null =>
  document.querySelector<T>(`[data-qa="${name}"]`);

const setup = (route: string) =>
  renderWithProviders(<App />, { route, dataSource: new DemoBankingDataSource(0) });

describe('App routing', () => {
  it('redirects an unknown route to the demo entry screen', async () => {
    setup('/nowhere');

    await waitFor(() => {
      expect(qa('enter-demo')).not.toBeNull();
    });
  });

  it('keeps the product area behind the demo gate', async () => {
    setup('/dashboard');

    await waitFor(() => {
      expect(qa('enter-demo')).not.toBeNull();
    });
    expect(qa('primary-nav')).toBeNull();
  });

  it('enters the demo and lands on the dashboard', async () => {
    const { user } = setup('/welcome');

    await waitFor(() => {
      expect(qa('enter-demo')).not.toBeNull();
    });

    await user.click(qa<HTMLButtonElement>('enter-demo') as HTMLButtonElement);

    await waitFor(() => {
      expect(qa('primary-nav')).not.toBeNull();
    });
    expect(sessionStorage.getItem('financial-app.demo-session')).toBe('true');
  });

  it('offers a skip link to the main content', async () => {
    setup('/welcome');

    const link = await screen.findByRole('link', { name: 'Skip to content' });
    expect(link).toHaveAttribute('href', '#main-content');
  });

  it('states that the data is a simulation', async () => {
    setup('/welcome');

    await waitFor(() => {
      expect(document.body.textContent).toMatch(/fictional/i);
    });
  });
});
