import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useLocation, useParams } from 'react-router-dom';
import { ApiError, api } from '../api/client';
import { StatusChip } from '../components/StatusChip';
import { formatRemaining, useCountdown } from '../hooks/useCountdown';
import { labels, errorMessage } from '../strings';
import { useStudentId } from '../student/StudentIdContext';

export function HoldPage() {
  const { holdId = '' } = useParams();
  const location = useLocation();
  const className = (location.state as { className?: string } | null)?.className;

  const { studentId, isValid } = useStudentId();
  const queryClient = useQueryClient();

  const holdQuery = useQuery({
    queryKey: ['hold', holdId],
    queryFn: () => api.getHold(holdId),
    enabled: holdId.length > 0,
    refetchInterval: 2000,
  });

  const hold = holdQuery.data;
  const remaining = useCountdown(hold?.expiresAt);

  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ['hold', holdId] });
    await queryClient.invalidateQueries({ queryKey: ['classes'] });
    await queryClient.invalidateQueries({ queryKey: ['myHolds'] });
  };

  const confirm = useMutation({
    mutationFn: () => api.confirmHold(holdId, studentId),
    onSuccess: refresh,
  });

  const cancel = useMutation({
    mutationFn: () => api.cancelHold(holdId, studentId),
    onSuccess: refresh,
  });

  const expired = hold?.status === 'HELD' && remaining <= 0;
  const status = expired ? 'EXPIRED' : hold?.status;

  return (
    <div className="page">
      <Link to="/">{labels.backToClasses}</Link>

      {holdQuery.isLoading ? <p className="hint">{labels.loading}</p> : null}
      {holdQuery.isError ? <p className="error">{errorMessage((holdQuery.error as ApiError).code)}</p> : null}

      {hold ? (
        <section className="card">
          <h2>{className ?? `${labels.classNameLabel} ${hold.classId}`}</h2>

          <p className="row">
            <span>{labels.status}</span>
            <StatusChip status={hold.status} expiresAt={hold.expiresAt} />
          </p>

          {status === 'HELD' ? (
            <p className="row">
              <span>{labels.timeLeft}</span>
              <b className="mono">{formatRemaining(remaining)}</b>
            </p>
          ) : null}

          <div className="actions">
            <button
              type="button"
              disabled={!isValid || status !== 'HELD' || confirm.isPending}
              onClick={() => confirm.mutate()}
            >
              {labels.pay}
            </button>
            <button
              type="button"
              disabled={!isValid || status !== 'HELD' || cancel.isPending}
              onClick={() => cancel.mutate()}
            >
              {labels.cancel}
            </button>
          </div>

          {status === 'CONFIRMED' ? <p className="ok">আপনার ভর্তি নিশ্চিত হয়েছে</p> : null}
          {status === 'EXPIRED' ? <p className="hint">আসনটি ছেড়ে দেওয়া হয়েছে</p> : null}
          {status === 'CANCELLED' ? <p className="hint">আবেদনটি বাতিল করা হয়েছে</p> : null}

          {confirm.isError ? <p className="error">{errorMessage((confirm.error as ApiError).code)}</p> : null}
          {cancel.isError ? <p className="error">{errorMessage((cancel.error as ApiError).code)}</p> : null}
        </section>
      ) : null}
    </div>
  );
}
