import { useEffect, useState } from 'react';

export function useCountdown(expiresAt: string | undefined): number {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  if (!expiresAt) {
    return 0;
  }

  return Math.max(0, new Date(expiresAt).getTime() - now);
}

export function formatRemaining(milliseconds: number): string {
  const totalSeconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}
