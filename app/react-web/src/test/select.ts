import type { UserEvent } from '@testing-library/user-event';

const find = (selector: string): HTMLElement => {
  const element = document.querySelector<HTMLElement>(selector);
  if (element === null) {
    throw new Error(`No element matched ${selector}`);
  }
  return element;
};

/**
 * Picks a value from a `FinSelect`.
 *
 * The component is a custom listbox rather than a native `<select>`, so the
 * trigger has to be opened before the option becomes clickable.
 */
export const chooseOption = async (user: UserEvent, qa: string, value: string): Promise<void> => {
  await user.click(find(`[data-qa="${qa}"]`));
  await user.click(find(`[data-qa="${qa}-option"][data-value="${value}"]`));
};

/** Current value of a `FinSelect` trigger. */
export const selectedValue = (qa: string): string | null =>
  find(`[data-qa="${qa}"]`).getAttribute('data-value');
