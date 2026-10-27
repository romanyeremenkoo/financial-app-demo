import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import { type Account, accountAvailable, accountBalance } from '../../domain/models/account.model';
import { Icon } from '../ui/Icon';
import { Money } from '../ui/Money';
import { accountTypeKey } from '../util/translation-key.util';
import './account-card.scss';

export interface AccountCardProps {
  readonly account: Account;
  readonly hidden?: boolean;
  readonly showActions?: boolean;
}

/** Account summary tile shared by the dashboard and the accounts page. */
export const AccountCard = ({ account, hidden = false, showActions = true }: AccountCardProps) => {
  const { t } = useTranslation();

  return (
    <article className="card" data-qa="account-card">
      <header className="card__header">
        <span className="card__icon" aria-hidden="true">
          <Icon name="wallet" size={18} />
        </span>
        <div className="card__identity">
          <h3 className="card__name">{account.name}</h3>
          <p className="card__type">
            {t(accountTypeKey(account.type))} · {account.currency}
          </p>
        </div>
      </header>

      <p className="card__iban">{account.maskedIban}</p>

      <div className="card__balances">
        <div>
          <p className="card__label">{t('accounts.balance')}</p>
          <Money className="card__balance" value={accountBalance(account)} hidden={hidden} />
        </div>
        <div>
          <p className="card__label">{t('accounts.available')}</p>
          <Money className="card__available" value={accountAvailable(account)} hidden={hidden} />
        </div>
      </div>

      {showActions ? (
        <footer className="card__footer">
          <Link className="card__link" to={`/transactions?account=${account.id}`}>
            {t('accounts.viewTransactions')}
            <Icon name="arrow-right" size={16} />
          </Link>
        </footer>
      ) : null}
    </article>
  );
};
