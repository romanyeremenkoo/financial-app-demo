import type { CurrencyCode } from '../money/currency';
import { type Money, money } from '../money/money';

export type AccountId = string;

export type AccountType = 'current' | 'savings' | 'joint';

/** Only `active` accounts are eligible as a transfer source or destination. */
export type AccountStatus = 'active' | 'closed';

export interface Account {
  readonly id: AccountId;
  readonly name: string;
  readonly type: AccountType;
  /** Fictional, partially masked IBAN, e.g. `IE** **** **** 4471`. */
  readonly maskedIban: string;
  readonly currency: CurrencyCode;
  /** Booked balance in minor units. */
  readonly balanceMinor: number;
  /** Spendable balance in minor units (booked minus pending holds). */
  readonly availableMinor: number;
  readonly status: AccountStatus;
}

export const ACCOUNT_TYPES: readonly AccountType[] = ['current', 'savings', 'joint'];

export const accountBalance = (account: Account): Money =>
  money(account.balanceMinor, account.currency);

export const accountAvailable = (account: Account): Money =>
  money(account.availableMinor, account.currency);

export const isEligibleForTransfer = (account: Account): boolean => account.status === 'active';

export const findAccount = (
  accounts: readonly Account[],
  id: AccountId | null,
): Account | undefined => (id === null ? undefined : accounts.find((account) => account.id === id));
