import type { Locale } from '../i18n/catalog';
import { useI18n } from '../i18n/useI18n';

const options: { value: Locale; labelKey: 'lang.bn' | 'lang.en'; short: string }[] = [
  { value: 'bn', labelKey: 'lang.bn', short: 'বাং' },
  { value: 'en', labelKey: 'lang.en', short: 'EN' },
];

export function LanguageSwitch({ className = '' }: { className?: string }) {
  const { locale, setLocale, t } = useI18n();

  return (
    <div
      role="group"
      aria-label={t('lang.label')}
      className={`inline-flex items-center rounded-lg border bg-white p-0.5 ${className}`}
    >
      {options.map(({ value, labelKey, short }) => {
        const active = locale === value;

        return (
          <button
            key={value}
            type="button"
            lang={value}
            onClick={() => setLocale(value)}
            aria-pressed={active}
            className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
              active
                ? 'bg-blue-800 text-white'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <span aria-hidden="true">{short}</span>
            <span className="sr-only">{t(labelKey)}</span>
          </button>
        );
      })}
    </div>
  );
}
