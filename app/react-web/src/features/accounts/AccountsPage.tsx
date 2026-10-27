import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useFeedback } from '../../app/providers/feedback-context';
import { useDocumentTitle } from '../../app/router/use-document-title';
import { useAccountName } from '../../application/hooks/use-account-name';
import { useBanking } from '../../application/hooks/use-banking';
import type { Card } from '../../domain/models/card.model';
import { AccountCard } from '../../shared/ledger/AccountCard';
import { ConfirmDialog } from '../../shared/ui/ConfirmDialog';
import { EmptyState } from '../../shared/ui/EmptyState';
import { PageHeader } from '../../shared/ui/PageHeader';
import { Skeleton } from '../../shared/ui/Skeleton';
import { range } from '../../shared/util/collection.util';
import { CardTile } from '../cards/CardTile';
import { cardToggleConfirmation, cardToggleFeedback, nextCardStatus } from './card-actions.util';
import './accounts.scss';

const SKELETON_ROW_COUNT = 3;

/**
 * Accounts and cards. Freezing is a confirmed, reversible action: the dialog
 * explains the consequence and the committed snapshot is immediate.
 */
const AccountsPage = () => {
  const { t } = useTranslation();
  const feedback = useFeedback();
  const { state, setCardStatus } = useBanking();
  const accountName = useAccountName();

  const [pendingCard, setPendingCard] = useState<Card | null>(null);
  const [busyCardId, setBusyCardId] = useState<string | null>(null);

  useDocumentTitle(t('documentTitle.accounts'));

  const loading = state.status === 'loading' || state.status === 'idle';
  const confirmation = pendingCard === null ? null : cardToggleConfirmation(pendingCard, t);

  const applyToggle = (card: Card): void => {
    setPendingCard(null);
    setBusyCardId(card.id);

    setCardStatus(card.id, nextCardStatus(card))
      .then((updated) => {
        feedback.success(cardToggleFeedback(updated, t));
      })
      .catch(() => {
        feedback.error(t('errors.cardUpdateFailed'));
      })
      .finally(() => {
        setBusyCardId(null);
      });
  };

  return (
    <div className="accounts">
      <PageHeader title={t('accounts.title')} subtitle={t('accounts.subtitle')} />

      <section className="section" aria-labelledby="accounts-heading">
        <h2 id="accounts-heading" className="section__title" data-qa="accounts-heading">
          {t('accounts.yourAccounts')}
        </h2>

        {loading ? (
          <div className="grid">
            {range(SKELETON_ROW_COUNT).map((row) => (
              <div className="skeleton-card" key={row}>
                <Skeleton height="140px" />
              </div>
            ))}
          </div>
        ) : state.accounts.length === 0 ? (
          <EmptyState
            icon="wallet"
            title={t('accounts.noAccountsTitle')}
            message={t('accounts.noAccountsMessage')}
          />
        ) : (
          <div className="grid">
            {state.accounts.map((account) => (
              <AccountCard key={account.id} account={account} hidden={state.balancesHidden} />
            ))}
          </div>
        )}
      </section>

      <section className="section" aria-labelledby="cards-heading">
        <h2 id="cards-heading" className="section__title">
          {t('accounts.virtualCards')}
        </h2>
        <p className="section__note">{t('accounts.cardsNote')}</p>

        {loading ? (
          <div className="grid grid--cards">
            {range(SKELETON_ROW_COUNT).map((row) => (
              <div className="skeleton-card" key={row}>
                <Skeleton height="240px" />
              </div>
            ))}
          </div>
        ) : state.cards.length === 0 ? (
          <EmptyState
            icon="card"
            title={t('accounts.noCardsTitle')}
            message={t('accounts.noCardsMessage')}
          />
        ) : (
          <div className="grid grid--cards">
            {state.cards.map((card) => (
              <CardTile
                key={card.id}
                card={card}
                accountName={accountName(card.accountId)}
                busy={busyCardId === card.id}
                onToggleRequested={setPendingCard}
              />
            ))}
          </div>
        )}
      </section>

      {pendingCard === null || confirmation === null ? null : (
        <ConfirmDialog
          title={confirmation.title}
          message={confirmation.message}
          confirmLabel={confirmation.confirmLabel}
          tone={confirmation.tone}
          onConfirm={() => {
            applyToggle(pendingCard);
          }}
          onCancel={() => {
            setPendingCard(null);
          }}
        />
      )}
    </div>
  );
};

export default AccountsPage;
