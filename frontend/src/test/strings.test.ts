import { errorMessage, statusLabels } from '../strings';

describe('error messages', () => {
  it('turns a seat conflict into readable text', () => {
    expect(errorMessage('NO_SEATS')).toBe('সিট শেষ হয়ে গেছে');
  });

  it('turns an expired application into readable text', () => {
    expect(errorMessage('HOLD_EXPIRED')).toBe('মেয়াদ শেষ');
  });

  it('falls back to a general message for unknown codes', () => {
    expect(errorMessage('SOMETHING_NEW')).toBe('কিছু একটা সমস্যা হয়েছে, আবার চেষ্টা করুন');
  });

  it('has a label for every status', () => {
    expect(Object.keys(statusLabels).sort()).toEqual(['CANCELLED', 'CONFIRMED', 'EXPIRED', 'HELD']);
  });
});
