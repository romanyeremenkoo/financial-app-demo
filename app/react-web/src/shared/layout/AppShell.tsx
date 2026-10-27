import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import { useDemoSession } from '../../app/providers/demo-session-context';
import { useFeedback } from '../../app/providers/feedback-context';
import { useBanking } from '../../application/hooks/use-banking';
import { useLedgerSelectors } from '../../application/hooks/use-ledger-selectors';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { Icon, type IconName } from '../ui/Icon';
import { LanguageSwitcher } from '../ui/LanguageSwitcher';
import { Money } from '../ui/Money';
import { Skeleton } from '../ui/Skeleton';
import { monogram } from '../util/monogram.util';
import './app-shell.scss';

interface NavItem {
  /** Doubles as the translation key suffix and the `data-qa` suffix. */
  readonly id: string;
  readonly path: string;
  readonly icon: IconName;
}

const NAV_ITEMS: readonly NavItem[] = [
  { id: 'dashboard', path: '/dashboard', icon: 'grid' },
  { id: 'accounts', path: '/accounts', icon: 'wallet' },
  { id: 'transactions', path: '/transactions', icon: 'list' },
  { id: 'transfers', path: '/transfers', icon: 'transfer' },
  { id: 'analytics', path: '/analytics', icon: 'chart' },
];

/**
 * Product shell: persistent navigation, balance summary and the routed
 * outlet. It also owns the one-time dataset load so every feature page can
 * assume the store is populated or explicitly loading.
 */
export const AppShell = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const session = useDemoSession();
  const feedback = useFeedback();
  const { state, holderName, dataSource, load, toggleBalances, resetDemoData } = useBanking();
  const { totalBalance } = useLedgerSelectors();

  const [navOpen, setNavOpen] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [resetting, setResetting] = useState(false);

  useEffect(() => {
    load();
  }, [load]);

  const balanceToggleKey = state.balancesHidden ? 'shell.showBalances' : 'shell.hideBalances';
  const closeNav = (): void => {
    setNavOpen(false);
  };

  const exitDemo = (): void => {
    session.exit();
    void navigate('/welcome');
  };

  const confirmReset = (): void => {
    setResetting(true);
    resetDemoData()
      .then(() => {
        feedback.success(t('shell.resetDemoFeedback'));
      })
      .catch(() => {
        feedback.error(t('errors.resetFailed'));
      })
      .finally(() => {
        setResetting(false);
        setResetOpen(false);
      });
  };

  return (
    <div className={`shell${navOpen ? ' shell--nav-open' : ''}`}>
      <aside className="sidebar" id="primary-navigation">
        <div className="sidebar__brand">
          <span className="brand-mark" aria-hidden="true">
            {t('app.mark')}
          </span>
          <span className="brand-name">{t('app.name')}</span>
        </div>

        <nav className="sidebar__nav" data-qa="primary-nav" aria-label={t('nav.primary')}>
          <ul className="nav-list">
            {NAV_ITEMS.map((item) => (
              <li key={item.id}>
                <NavLink
                  className={({ isActive }) => `nav-link${isActive ? ' nav-link--active' : ''}`}
                  data-qa={`nav-link-${item.id}`}
                  to={item.path}
                  onClick={closeNav}
                >
                  <Icon name={item.icon} size={19} />
                  <span>{t(`nav.${item.id}`)}</span>
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        <div className="sidebar__footer">
          <div className="balance-card">
            <p className="balance-card__label">{t('shell.totalBalance')}</p>
            {state.status === 'loading' ? (
              <Skeleton width="120px" height="26px" />
            ) : (
              <Money
                className="balance-card__value"
                value={totalBalance}
                hidden={state.balancesHidden}
              />
            )}
            <button type="button" className="balance-card__toggle" onClick={toggleBalances}>
              <Icon name={state.balancesHidden ? 'eye' : 'eye-off'} size={15} />
              {t(balanceToggleKey)}
            </button>
          </div>

          {dataSource.supportsReset ? (
            <button
              type="button"
              className="ghost-button"
              data-qa="reset-demo"
              onClick={() => {
                setResetOpen(true);
              }}
            >
              <Icon name="refresh" size={18} />
              {t('shell.resetDemo')}
            </button>
          ) : null}

          {dataSource.mode === 'api' ? (
            <p className="api-mode" data-qa="api-mode">
              {t('shell.apiMode')}
            </p>
          ) : null}

          <button type="button" className="ghost-button" data-qa="exit-demo" onClick={exitDemo}>
            <Icon name="logout" size={18} />
            {t('shell.exitDemo')}
          </button>
        </div>
      </aside>

      {navOpen ? (
        <button
          type="button"
          className="scrim"
          data-qa="nav-scrim"
          aria-label={t('nav.close')}
          onClick={closeNav}
        />
      ) : null}

      <div className="main-column">
        <header className="topbar">
          <button
            type="button"
            className="icon-button topbar__menu"
            data-qa="nav-toggle"
            aria-expanded={navOpen}
            aria-controls="primary-navigation"
            aria-label={t('nav.toggle')}
            onClick={() => {
              setNavOpen((open) => !open);
            }}
          >
            <Icon name={navOpen ? 'close' : 'menu'} size={20} />
          </button>

          <div className="topbar__greeting">
            <p className="topbar__eyebrow">{t('shell.signedInAs')}</p>
            <p className="topbar__name">{holderName}</p>
          </div>

          <div className="topbar__actions">
            <LanguageSwitcher />

            <button
              type="button"
              className="icon-button"
              data-qa="balance-toggle"
              aria-pressed={state.balancesHidden}
              onClick={toggleBalances}
            >
              <Icon name={state.balancesHidden ? 'eye' : 'eye-off'} size={19} />
              <span className="fin-visually-hidden">{t(balanceToggleKey)}</span>
            </button>
            <Link
              className="fin-button fin-button--primary topbar__cta"
              data-qa="new-transfer"
              to="/transfers"
            >
              <Icon name="transfer" size={18} />
              {t('shell.newTransfer')}
            </Link>
            <span className="avatar" aria-hidden="true">
              {monogram(holderName)}
            </span>
          </div>
        </header>

        <main id="main-content" className="content" tabIndex={-1}>
          {state.status === 'error' && state.error !== null ? (
            <div className="load-error" role="alert" data-qa="load-error">
              <Icon name="alert" size={22} />
              <div>
                <h2 className="load-error__title">{t(state.error.titleKey)}</h2>
                <p className="load-error__text">{t(state.error.messageKey)}</p>
              </div>
              <button
                type="button"
                className="fin-button fin-button--secondary"
                data-qa="load-retry"
                onClick={() => {
                  load(true);
                }}
              >
                {t('shell.tryAgain')}
              </button>
            </div>
          ) : (
            <Outlet />
          )}
        </main>

        <footer className="disclaimer">{t('app.disclaimer')}</footer>
      </div>

      {resetOpen ? (
        <ConfirmDialog
          title={t('shell.resetDemoTitle')}
          message={t('shell.resetDemoMessage')}
          confirmLabel={t('shell.resetDemo')}
          busy={resetting}
          onConfirm={confirmReset}
          onCancel={() => {
            setResetOpen(false);
          }}
        />
      ) : null}
    </div>
  );
};
