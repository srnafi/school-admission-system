declare global {
  interface Window {
    __CONFIG__?: {
      API_URL?: string;
    };
  }
}

const buildTimeUrl = import.meta.env.VITE_API_URL as string | undefined;

export function apiBaseUrl(): string {
  const runtimeUrl = window.__CONFIG__?.API_URL;
  const url = runtimeUrl || buildTimeUrl || 'http://localhost:8080';

  return url.replace(/\/+$/, '');
}
