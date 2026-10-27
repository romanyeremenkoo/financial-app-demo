import type { AccountId } from './account.model';

export type CardId = string;

export type CardStatus = 'active' | 'frozen';

export type CardNetwork = 'visa' | 'mastercard';

/**
 * Fictional virtual card. The masked number is not a valid payment credential:
 * it only ever carries display digits with no issuer meaning.
 */
export interface Card {
  readonly id: CardId;
  readonly accountId: AccountId;
  readonly label: string;
  readonly holderName: string;
  /** e.g. `•••• •••• •••• 4218` */
  readonly maskedNumber: string;
  /** `MM/YY` */
  readonly expiry: string;
  readonly network: CardNetwork;
  readonly status: CardStatus;
}

export const toggleCardStatus = (card: Card): Card => ({
  ...card,
  status: card.status === 'active' ? 'frozen' : 'active',
});

export const nextCardStatus = (status: CardStatus): CardStatus =>
  status === 'active' ? 'frozen' : 'active';
