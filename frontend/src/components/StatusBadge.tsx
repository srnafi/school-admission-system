import { Badge } from '@mantine/core';
import type { HoldStatus } from '../api/types';
import { useCountdown } from '../hooks/useCountdown';
import { statusLabels } from '../strings';

const colors: Record<HoldStatus, string> = {
  HELD: 'yellow',
  CONFIRMED: 'teal',
  EXPIRED: 'gray',
  CANCELLED: 'red',
};

export function StatusBadge({ status, expiresAt }: { status: HoldStatus; expiresAt: string }) {
  const remaining = useCountdown(expiresAt);
  const effective: HoldStatus = status === 'HELD' && remaining <= 0 ? 'EXPIRED' : status;

  return (
    <Badge color={colors[effective]} variant="light" radius="sm" size="lg">
      {statusLabels[effective]}
    </Badge>
  );
}
