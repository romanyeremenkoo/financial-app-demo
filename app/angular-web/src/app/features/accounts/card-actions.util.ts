import { TranslateService } from '@ngx-translate/core';
import { Card } from '../../domain/models/card.model';
import { ConfirmDialogData } from '../../shared/ui/confirm-dialog/confirm-dialog.component';
import { translateNow } from '../../core/i18n/translate.util';

/** Copy for the freeze / unfreeze confirmation, derived from the card state. */
export const cardToggleConfirmation = (
  card: Card,
  translate: TranslateService,
): ConfirmDialogData =>
  card.status === 'active'
    ? {
        title: translateNow(translate, 'card.freezeTitle'),
        message: translateNow(translate, 'card.freezeMessage', { card: card.label }),
        confirmLabel: translateNow(translate, 'card.freeze'),
        tone: 'danger',
      }
    : {
        title: translateNow(translate, 'card.unfreezeTitle'),
        message: translateNow(translate, 'card.unfreezeMessage', { card: card.label }),
        confirmLabel: translateNow(translate, 'card.unfreeze'),
        tone: 'primary',
      };

export const cardToggleFeedback = (card: Card, translate: TranslateService): string =>
  translateNow(
    translate,
    card.status === 'frozen' ? 'card.frozenFeedback' : 'card.activeFeedback',
    {
      card: card.label,
    },
  );
