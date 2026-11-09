import type { HoldStatus } from '../api/types';
import { useCountdown } from '../hooks/useCountdown';
import { statusLabels } from '../strings';

export function StatusChip({ status, expiresAt }: { status: HoldStatus; expiresAt: string }) {
  const remaining = useCountdown(expiresAt);
  const effective: HoldStatus = status === 'HELD' && remaining <= 0 ? 'EXPIRED' : status;

  return <span className={`chip chip-${effective.toLowerCase()}`}>{statusLabels[effective]}</span>;
}
