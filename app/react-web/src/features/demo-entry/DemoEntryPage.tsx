import { useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import { useDemoSession } from '../../app/providers/demo-session-context';
import { useDocumentTitle } from '../../app/router/use-document-title';
import { useBanking } from '../../application/hooks/use-banking';
import { Icon } from '../../shared/ui/Icon';
import { LanguageSwitcher } from '../../shared/ui/LanguageSwitcher';
import './demo-entry.scss';

const HIGHLIGHT_KEYS = [
  'demoEntry.highlights.accounts',
  'demoEntry.highlights.history',
  'demoEntry.highlights.transfers',
] as const;

/**
 * Demo entry screen. Deliberately not an authentication form: there are no
 * credentials to verify, so the screen explains the simulation and unlocks the
 * product area.
 */
const DemoEntryPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const session = useDemoSession();
  const { load } = useBanking();

  useDocumentTitle(t('documentTitle.welcome'));

  const enterDemo = (): void => {
    session.enter();
    load();
    void navigate('/dashboard');
  };

  return (
    <main className="entry-page" id="main-content" tabIndex={-1}>
      <div className="entry">
        <section className="entry__panel">
          <div className="entry__top">
            <div className="brand">
              <span className="brand__mark" aria-hidden="true">
                {t('app.mark')}
              </span>
              <span className="brand__name">{t('app.name')}</span>
            </div>
            <LanguageSwitcher />
          </div>

          <h1 className="entry__title">{t('demoEntry.title')}</h1>
          <p className="entry__lead">{t('demoEntry.lead')}</p>

          <ul className="entry__list">
            {HIGHLIGHT_KEYS.map((key) => (
              <li className="entry__item" key={key}>
                <span className="entry__check" aria-hidden="true">
                  <Icon name="check" size={14} />
                </span>
                {t(key)}
              </li>
            ))}
          </ul>

          <button
            type="button"
            className="fin-button fin-button--primary entry__cta"
            data-qa="enter-demo"
            onClick={enterDemo}
          >
            {t('demoEntry.cta')}
            <Icon name="arrow-right" size={18} />
          </button>

          <p className="entry__note">{t('demoEntry.note')}</p>
        </section>

        <aside className="entry__preview" aria-hidden="true">
          <div className="preview-card">
            <p className="preview-card__label">{t('demoEntry.previewBalance')}</p>
            <p className="preview-card__value">€ • • • •</p>
            <div className="preview-card__row">
              <span>{t('demoEntry.previewCurrent')}</span>
              <span className="preview-card__bar preview-card__bar--current" />
            </div>
            <div className="preview-card__row">
              <span>{t('demoEntry.previewSavings')}</span>
              <span className="preview-card__bar preview-card__bar--savings" />
            </div>
            <div className="preview-card__row">
              <span>{t('demoEntry.previewJoint')}</span>
              <span className="preview-card__bar preview-card__bar--joint" />
            </div>
          </div>
          <div className="preview-chip preview-chip--one">
            {t('demoEntry.previewChipTransfers')}
          </div>
          <div className="preview-chip preview-chip--two">
            {t('demoEntry.previewChipAnalytics')}
          </div>
        </aside>
      </div>
    </main>
  );
};

export default DemoEntryPage;
