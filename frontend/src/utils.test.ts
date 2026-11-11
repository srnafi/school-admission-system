import { describe, it, expect } from 'vitest';
import { effectiveStatus, formatRemaining, isValidStudentId } from './utils';

describe('utils', () => {
  it('validates 17-digit ids', () => {
    expect(isValidStudentId('20152691234567890')).toBe(true);
    expect(isValidStudentId('123')).toBe(false);
  });
  it('flips expired HELD holds locally', () => {
    const past = new Date(Date.now() - 1000).toISOString();
    expect(effectiveStatus('HELD', past, Date.now())).toBe('EXPIRED');
    expect(effectiveStatus('CONFIRMED', past, Date.now())).toBe('CONFIRMED');
  });
  it('formats remaining time', () => {
    const now = Date.now();
    expect(formatRemaining(new Date(now + 125000).toISOString(), now)).toBe('02:05');
  });
});
