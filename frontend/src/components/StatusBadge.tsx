import type { HoldStatus } from '../types';
import { statusLabel } from '../utils';

export default function StatusBadge({ status }: { status: HoldStatus }) {
  return <span className={`badge ${status}`}>{statusLabel[status]}</span>;
}
