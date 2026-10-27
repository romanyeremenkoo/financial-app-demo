import { useTranslation } from 'react-i18next';
import { useLanguage } from '../../app/providers/language-context';
import { APP_LANGUAGES, LANGUAGE_SHORT_LABEL } from '../../i18n/language';
import './language-switcher.scss';

/** Segmented control that switches the active interface language at runtime. */
export const LanguageSwitcher = () => {
  const { t } = useTranslation();
  const { language, use } = useLanguage();

  return (
    <div className="switch" role="group" data-qa="language-switch" aria-label={t('language.label')}>
      {APP_LANGUAGES.map((option) => (
        <button
          key={option}
          type="button"
          className={`switch__option${language === option ? ' switch__option--active' : ''}`}
          data-qa={`language-${option}`}
          aria-pressed={language === option}
          aria-label={t('language.switchTo', { language: t(`language.${option}`) })}
          onClick={() => {
            use(option);
          }}
        >
          {LANGUAGE_SHORT_LABEL[option]}
        </button>
      ))}
    </div>
  );
};
