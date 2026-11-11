import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';
import Root from './Root';
import { I18nProvider } from './i18n/provider';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <I18nProvider>
      <Root />
    </I18nProvider>
  </StrictMode>,
);
