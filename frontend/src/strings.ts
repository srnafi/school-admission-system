export const labels = {
  title: 'স্কুল ভর্তি',
  subtitle: 'আসন ও আবেদন ডেস্ক',
  studentId: 'জন্ম নিবন্ধন নম্বর',
  studentIdPlaceholder: '১৭ অঙ্কের নম্বর',
  navClasses: 'ক্লাস তালিকা',
  navMyHolds: 'আমার আবেদন',
  createClassTitle: 'নতুন শ্রেণি',
  className: 'শ্রেণির নাম',
  classNamePlaceholder: 'Class 6 - Morning Shift',
  totalSeats: 'আসন সংখ্যা',
  createClass: 'যোগ করুন',
  seatsTotal: 'মোট আসন',
  seatsHeld: 'হোল্ডে',
  seatsConfirmed: 'নিশ্চিত',
  seatsAvailable: 'খালি',
  apply: 'আবেদন করুন',
  applying: 'অপেক্ষা করুন…',
  full: 'আসন নেই',
  status: 'অবস্থা',
  timeLeft: 'বাকি সময়',
  pay: 'ভর্তি ফি দিন',
  cancel: 'বাতিল',
  backToClasses: 'ক্লাস তালিকায় ফিরুন',
  myHoldsTitle: 'আমার আবেদন',
  noHolds: 'এখনো কোনো আবেদন নেই',
  noClasses: 'এখনো কোনো ক্লাস তৈরি হয়নি',
  needStudentId: 'শুরু করতে জন্ম নিবন্ধন নম্বর দিন',
  loading: 'লোড হচ্ছে…',
  classNameLabel: 'শ্রেণি',
  details: 'বিস্তারিত',
  holdId: 'আবেদন নম্বর',
  expiresAt: 'শেষ সময়',
  crashed: 'কিছু একটা সমস্যা হয়েছে, আবার চেষ্টা করুন',
  reload: 'পাতা আবার লোড করুন',
  retry: 'আবার চেষ্টা করুন',
  search: 'শ্রেণি বা কোড খুঁজুন',
  filterAll: 'সব শ্রেণি',
  filterAvailable: 'আসন আছে',
  filterFull: 'আসন নেই',
  serial: 'ক্রম',
  seatChart: 'আসন বিন্যাস',
  action: 'পদক্ষেপ',
  unit: 'টি',
  live: 'লাইভ',
  printVoucher: 'প্রিন্ট',
  notFoundTitle: 'এই পাতা নেই',
  notFoundNote: 'ঠিকানাটি ভুল, অথবা পাতাটি সরিয়ে ফেলা হয়েছে।',
} as const;

export const statusLabels: Record<string, string> = {
  HELD: 'হোল্ডে',
  CONFIRMED: 'নিশ্চিত',
  EXPIRED: 'মেয়াদ শেষ',
  CANCELLED: 'বাতিল',
};

export const statusNotes: Record<string, string> = {
  HELD: 'ফি বাকি',
  CONFIRMED: 'ফি পরিশোধিত',
  EXPIRED: 'সময় শেষ হয়েছে',
  CANCELLED: 'প্রত্যাহার করা হয়েছে',
};

const errorMessages: Record<string, string> = {
  NO_SEATS: 'সিট শেষ হয়ে গেছে',
  ALREADY_APPLIED: 'আপনি এই ক্লাসে ইতিমধ্যে আবেদন করেছেন',
  HOLD_EXPIRED: 'মেয়াদ শেষ',
  HOLD_NOT_ACTIVE: 'এই আবেদন আর পরিবর্তন করা যায় না',
  FORBIDDEN: 'এই আবেদন আপনার নয়',
  CLASS_NOT_FOUND: 'ক্লাসটি পাওয়া যায়নি',
  HOLD_NOT_FOUND: 'আবেদনটি পাওয়া যায়নি',
  INVALID_INPUT: 'তথ্য সঠিক নয়',
  INVALID_STUDENT_ID: '১৭ অঙ্কের সঠিক নম্বর দিন',
  NETWORK_ERROR: 'সার্ভারে সমস্যা, আবার চেষ্টা করুন',
  UNKNOWN_ERROR: 'কিছু একটা সমস্যা হয়েছে, আবার চেষ্টা করুন',
};

export function errorMessage(code: string | undefined): string {
  if (!code) {
    return errorMessages.UNKNOWN_ERROR;
  }

  return errorMessages[code] ?? errorMessages.UNKNOWN_ERROR;
}

const bengaliDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];

export function toBengaliDigits(value: number | string): string {
  return String(value).replace(/\d/g, (digit) => bengaliDigits[Number(digit)]);
}

export function sessionLabel(date = new Date()): string {
  return `${toBengaliDigits(date.getFullYear())} শিক্ষাবর্ষ`;
}
