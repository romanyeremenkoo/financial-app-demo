import type { TFunction } from 'i18next';
import type { Card } from '../../domain/models/card.model';

export interface CardConfirmation {
  readonly title: string;
  readonly message: string;
  readonly confirmLabel: string;
  readonly tone: 'primary' | 'danger';
}

/** Copy for the freeze / unfreeze confirmation, derived from the card state. */
export const cardToggleConfirmation = (card: Card, t: TFunction): CardConfirmation =>
  card.status === 'active'
    ? {
        title: t('card.freezeTitle'),
        message: t('card.freezeMessage', { card: card.label }),
        confirmLabel: t('card.freeze'),
        tone: 'danger',
      }
    : {
        title: t('card.unfreezeTitle'),
        message: t('card.unfreezeMessage', { card: card.label }),
        confirmLabel: t('card.unfreeze'),
        tone: 'primary',
      };

export const cardToggleFeedback = (card: Card, t: TFunction): string =>
  t(card.status === 'frozen' ? 'card.frozenFeedback' : 'card.activeFeedback', {
    card: card.label,
  });

/** A freeze toggles to frozen; anything else returns the card to active. */
export const nextCardStatus = (card: Card): Card['status'] =>
  card.status === 'active' ? 'frozen' : 'active';
