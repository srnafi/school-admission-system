import type { HoldStatus } from '../api/types';
import { formatRemaining, useCountdown } from '../hooks/useCountdown';
import { statusLabels } from '../strings';

const stampClass: Record<HoldStatus, string> = {
  HELD: 'stamp stamp-held',
  CONFIRMED: 'stamp stamp-confirmed',
  EXPIRED: 'stamp stamp-expired',
  CANCELLED: 'stamp stamp-cancelled',
};

interface StatusStampProps {
  status: HoldStatus;
  expiresAt: string;
  size?: 'sm' | 'lg';
  showTimer?: boolean;
}

export function StatusStamp({ status, expiresAt, size = 'sm', showTimer = false }: StatusStampProps) {
  const remaining = useCountdown(expiresAt);
  const effective: HoldStatus = status === 'HELD' && remaining <= 0 ? 'EXPIRED' : status;

  return (
    <span className={`${stampClass[effective]}${size === 'lg' ? ' stamp-lg' : ''}`}>
      {statusLabels[effective]}
      {showTimer && effective === 'HELD' && remaining > 0 && (
        <span className="stamp-timer">{formatRemaining(remaining)}</span>
      )}
    </span>
  );
}
