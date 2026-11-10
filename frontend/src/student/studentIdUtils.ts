export function sanitizeStudentId(value: string): string {
  return value.replace(/\D/g, '').slice(0, 17);
}

export function isValidStudentId(value: string): boolean {
  return /^\d{17}$/.test(value);
}

export function formatStudentIdDisplay(id: string): string {
  // Format as YYYY-DDDD-DDDDD-DDDD if length matches or grouped
  const digits = sanitizeStudentId(id);
  if (digits.length <= 4) return digits;
  if (digits.length <= 8) return `${digits.slice(0, 4)} ${digits.slice(4)}`;
  if (digits.length <= 13) return `${digits.slice(0, 4)} ${digits.slice(4, 8)} ${digits.slice(8)}`;
  return `${digits.slice(0, 4)} ${digits.slice(4, 8)} ${digits.slice(8, 13)} ${digits.slice(13)}`;
}
