export function formatDateTime(iso: string): string {
  const date = new Date(iso);

  if (Number.isNaN(date.getTime())) {
    return '—';
  }

  return date.toLocaleString('bn-BD', { dateStyle: 'medium', timeStyle: 'short' });
}

export function formatClock(iso: string): string {
  const date = new Date(iso);

  if (Number.isNaN(date.getTime())) {
    return '—';
  }

  return date.toLocaleTimeString('bn-BD', { hour: '2-digit', minute: '2-digit' });
}
