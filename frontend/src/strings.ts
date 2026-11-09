export const labels = {
  title: 'স্কুল ভর্তি ব্যবস্থাপনা',
  studentId: 'শিক্ষার্থীর জন্ম নিবন্ধন নম্বর',
  studentIdPlaceholder: '১৭ অঙ্কের নম্বর',
  studentIdHint: '১৭ অঙ্কের নম্বর লিখুন',
  navClasses: 'ক্লাস তালিকা',
  navMyHolds: 'আমার আবেদন',
  createClassTitle: 'নতুন ক্লাস তৈরি করুন',
  className: 'ক্লাসের নাম',
  classNamePlaceholder: 'Class 6 - Morning Shift',
  totalSeats: 'মোট আসন',
  createClass: 'ক্লাস তৈরি করুন',
  seatsTotal: 'মোট',
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
  backToClasses: 'ক্লাস তালিকায় ফিরে যান',
  myHoldsTitle: 'আমার আবেদন',
  noHolds: 'এখনো কোনো আবেদন নেই',
  noClasses: 'এখনো কোনো ক্লাস তৈরি হয়নি',
  needStudentId: 'শুরু করতে উপরে আপনার জন্ম নিবন্ধন নম্বর দিন',
  loading: 'লোড হচ্ছে…',
  classNameLabel: 'ক্লাস',
  crashed: 'কিছু একটা সমস্যা হয়েছে, আবার চেষ্টা করুন',
  reload: 'পাতা আবার লোড করুন',
} as const;

export const statusLabels: Record<string, string> = {
  HELD: 'হোল্ডে',
  CONFIRMED: 'নিশ্চিত',
  EXPIRED: 'মেয়াদ শেষ',
  CANCELLED: 'বাতিল',
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
