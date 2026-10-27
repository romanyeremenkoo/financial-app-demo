import { useTranslation } from 'react-i18next';
import { AppRouter } from './router/AppRouter';
import './app.scss';

export const App = () => {
  const { t } = useTranslation();

  return (
    <>
      <a className="skip-link" href="#main-content">
        {t('app.skipToContent')}
      </a>
      <AppRouter />
    </>
  );
};
