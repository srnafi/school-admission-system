import { createContext } from 'react';
import type { Locale, Translate } from './catalog';

export interface I18nValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: Translate;
}

export const I18nContext = createContext<I18nValue | null>(null);
