import type { HoldStatus } from '../api/types';
import { useCountdown } from '../hooks/useCountdown';
import { statusLabels } from '../strings';

const classes: Record<HoldStatus, string> = {
  HELD: 'pill pill-held',
  CONFIRMED: 'pill pill-confirmed',
  EXPIRED: 'pill pill-expired',
  CANCELLED: 'pill pill-cancelled',
};

export function StatusBadge({ status, expiresAt }: { status: HoldStatus; expiresAt: string }) {
  const remaining = useCountdown(expiresAt);
  const effective: HoldStatus = status === 'HELD' && remaining <= 0 ? 'EXPIRED' : status;

  return <span className={classes[effective]}>{statusLabels[effective]}</span>;
}
