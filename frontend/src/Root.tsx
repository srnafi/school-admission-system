import App from './App';
import { ErrorBoundary } from './components/ErrorBoundary';
import { useI18n } from './i18n/useI18n';

export default function Root() {
  const { t } = useI18n();

  return (
    <ErrorBoundary title={t('boundary.title')} reloadLabel={t('boundary.reload')}>
      <App />
    </ErrorBoundary>
  );
}
