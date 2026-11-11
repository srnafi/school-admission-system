declare global {
  interface Window {
    __CONFIG__?: {
      API_URL?: string;
    };
  }
}

const buildTimeUrl = import.meta.env.VITE_API_URL as string | undefined;

/** The container writes config.js at start-up, so one image can talk to any API address. */
export function apiBaseUrl(): string {
  const url = window.__CONFIG__?.API_URL || buildTimeUrl || 'http://localhost:8080';

  return url.replace(/\/+$/, '');
}
