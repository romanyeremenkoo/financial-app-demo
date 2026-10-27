import { useTranslation } from 'react-i18next';
import type { Card } from '../../domain/models/card.model';
import { Icon } from '../../shared/ui/Icon';
import { StatusChip, type StatusTone } from '../../shared/ui/StatusChip';
import { cardStatusKey } from '../../shared/util/translation-key.util';
import './card-tile.scss';

export interface CardTileProps {
  readonly card: Card;
  readonly accountName: string;
  readonly busy?: boolean;
  readonly onToggleRequested: (card: Card) => void;
}

/** Virtual card visual with its freeze / unfreeze control. */
export const CardTile = ({ card, accountName, busy = false, onToggleRequested }: CardTileProps) => {
  const { t } = useTranslation();

  const frozen = card.status === 'frozen';
  const tone: StatusTone = frozen ? 'info' : 'success';
  const networkLabel = card.network === 'visa' ? 'VISA' : 'Mastercard';

  return (
    <article className="tile" data-qa="card-tile" data-card-id={card.id}>
      <div className={`plastic${frozen ? ' plastic--frozen' : ''}`}>
        <div className="plastic__top">
          <span className="plastic__label">{card.label}</span>
          <span className="plastic__network">{networkLabel}</span>
        </div>

        <p className="plastic__number">{card.maskedNumber}</p>

        <div className="plastic__bottom">
          <div>
            <span className="plastic__caption">{t('card.holder')}</span>
            <span className="plastic__value">{card.holderName}</span>
          </div>
          <div>
            <span className="plastic__caption">{t('card.expires')}</span>
            <span className="plastic__value">{card.expiry}</span>
          </div>
        </div>

        {frozen ? (
          <span className="plastic__frozen-badge" data-qa="card-frozen-badge">
            <Icon name="freeze" size={16} />
            {t('card.frozen')}
          </span>
        ) : null}
      </div>

      <div className="tile__meta">
        <div>
          <p className="tile__account">{accountName}</p>
          <StatusChip qa="card-status" label={t(cardStatusKey(card.status))} tone={tone} />
        </div>

        <button
          type="button"
          className={`fin-button fin-button--${frozen ? 'primary' : 'secondary'}`}
          disabled={busy}
          data-qa="card-toggle"
          onClick={() => {
            onToggleRequested(card);
          }}
        >
          <Icon name={frozen ? 'unfreeze' : 'freeze'} size={17} />
          {t(frozen ? 'card.unfreeze' : 'card.freeze')}
        </button>
      </div>
    </article>
  );
};
