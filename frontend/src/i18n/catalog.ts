import { bn } from './messages.bn';
import { en } from './messages.en';

export type Locale = 'bn' | 'en';
export type MessageKey = keyof typeof bn;
export type Translate = (key: MessageKey, vars?: Record<string, string | number>) => string;

export const DEFAULT_LOCALE: Locale = 'bn';
export const LOCALE_STORAGE_KEY = 'locale';

const catalogs: Record<Locale, Record<MessageKey, string>> = { bn, en };

export function isLocale(value: string | null): value is Locale {
  return value === 'bn' || value === 'en';
}

export function translate(
  locale: Locale,
  key: MessageKey,
  vars?: Record<string, string | number>,
): string {
  const template = catalogs[locale][key] ?? catalogs[DEFAULT_LOCALE][key];

  if (!vars) {
    return template;
  }

  return template.replace(/\{(\w+)\}/g, (match, name: string) =>
    name in vars ? String(vars[name]) : match,
  );
}

export function errorKey(code: string): MessageKey {
  const key = `error.${code}` as MessageKey;

  return key in bn ? key : 'error.generic';
}
