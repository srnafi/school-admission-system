import type { HoldStatus } from '../api/types';
import { useCountdown, formatRemaining } from '../hooks/useCountdown';
import { statusLabels } from '../strings';

const classes: Record<HoldStatus, string> = {
  HELD: 'badge-pill badge-held',
  CONFIRMED: 'badge-pill badge-confirmed',
  EXPIRED: 'badge-pill badge-expired',
  CANCELLED: 'badge-pill badge-cancelled',
};

interface StatusBadgeProps {
  status: HoldStatus;
  expiresAt: string;
  showCountdown?: boolean;
}

export function StatusBadge({ status, expiresAt, showCountdown = false }: StatusBadgeProps) {
  const remaining = useCountdown(expiresAt);
  const effective: HoldStatus = status === 'HELD' && remaining <= 0 ? 'EXPIRED' : status;

  return (
    <span className={classes[effective]}>
      <span className="badge-dot" aria-hidden="true" />
      <span className="badge-label">{statusLabels[effective]}</span>
      {showCountdown && effective === 'HELD' && remaining > 0 && (
        <span className="badge-timer num">({formatRemaining(remaining)})</span>
      )}
    </span>
  );
}
