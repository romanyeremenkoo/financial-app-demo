import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router';
import { App } from './app/App';
import { AppProviders } from './app/providers/AppProviders';
import './styles/global.scss';

const container = document.getElementById('root');
if (container === null) {
  throw new Error('Root container #root is missing from index.html.');
}

createRoot(container).render(
  <StrictMode>
    <BrowserRouter>
      <AppProviders>
        <App />
      </AppProviders>
    </BrowserRouter>
  </StrictMode>,
);
