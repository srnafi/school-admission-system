import type { HoldStatus } from './types';

export const isValidStudentId = (s: string) => /^\d{17}$/.test(s);

/** A HELD hold whose time ran out is shown as EXPIRED without waiting for the server. */
export function effectiveStatus(status: HoldStatus, expiresAt: string, now: number): HoldStatus {
  return status === 'HELD' && Date.parse(expiresAt) <= now ? 'EXPIRED' : status;
}

export function formatRemaining(expiresAt: string, now: number): string {
  const ms = Math.max(0, Date.parse(expiresAt) - now);
  const total = Math.floor(ms / 1000);
  const m = String(Math.floor(total / 60)).padStart(2, '0');
  const s = String(total % 60).padStart(2, '0');
  return `${m}:${s}`;
}

export const errMsg = (e: unknown) =>
  e instanceof Error ? e.message : 'একটি অপ্রত্যাশিত সমস্যা হয়েছে।';

export const statusLabel: Record<HoldStatus, string> = {
  HELD: 'অপেক্ষমাণ (Hold)',
  CONFIRMED: 'ভর্তি নিশ্চিত',
  EXPIRED: 'মেয়াদ শেষ',
  CANCELLED: 'বাতিল',
};
