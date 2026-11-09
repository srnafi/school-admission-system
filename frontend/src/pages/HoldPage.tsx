import { Alert, Anchor, Button, Group } from '@mantine/core';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useLocation, useParams } from 'react-router-dom';
import { ApiError, api } from '../api/client';
import { StatusBadge } from '../components/StatusBadge';
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
    <>
      <div>
        <Anchor component={Link} to="/" size="xs" c="dimmed">
          {labels.backToClasses}
        </Anchor>
      </div>

      {holdQuery.isLoading ? <div className="empty">{labels.loading}</div> : null}

      {holdQuery.isError ? (
        <Alert color="red" variant="light">
          {errorMessage((holdQuery.error as ApiError).code)}
        </Alert>
      ) : null}

      {hold ? (
        <div className="detail-grid">
          <div className="panel">
            <div className="panel-head">
              <h1 className="page-title">{className ?? `${labels.classNameLabel} ${hold.classId}`}</h1>
              <StatusBadge status={hold.status} expiresAt={hold.expiresAt} />
            </div>

            <div className="detail-body">
              {status === 'HELD' ? (
                <div>
                  <div className="field-label">{labels.timeLeft}</div>
                  <div className="countdown-value">{formatRemaining(remaining)}</div>
                </div>
              ) : null}

              <Group gap="sm">
                <Button
                  disabled={!isValid || status !== 'HELD'}
                  loading={confirm.isPending}
                  onClick={() => confirm.mutate()}
                >
                  {labels.pay}
                </Button>
                <Button
                  variant="default"
                  disabled={!isValid || status !== 'HELD'}
                  loading={cancel.isPending}
                  onClick={() => cancel.mutate()}
                >
                  {labels.cancel}
                </Button>
              </Group>

              {status === 'CONFIRMED' ? (
                <Alert color="teal" variant="light">
                  আপনার ভর্তি নিশ্চিত হয়েছে
                </Alert>
              ) : null}
              {status === 'EXPIRED' ? (
                <Alert color="gray" variant="light">
                  আসনটি ছেড়ে দেওয়া হয়েছে
                </Alert>
              ) : null}
              {status === 'CANCELLED' ? (
                <Alert color="red" variant="light">
                  আবেদনটি বাতিল করা হয়েছে
                </Alert>
              ) : null}

              {confirm.isError ? (
                <Alert color="red" variant="light">
                  {errorMessage((confirm.error as ApiError).code)}
                </Alert>
              ) : null}
              {cancel.isError ? (
                <Alert color="red" variant="light">
                  {errorMessage((cancel.error as ApiError).code)}
                </Alert>
              ) : null}
            </div>
          </div>

          <div className="panel">
            <div className="panel-head">
              <h2 className="panel-title">{labels.details}</h2>
            </div>
            <ul className="detail-list">
              <li>
                <span>{labels.holdId}</span>
                <b>{hold.holdId}</b>
              </li>
              <li>
                <span>{labels.classNameLabel}</span>
                <b>{hold.classId}</b>
              </li>
              <li>
                <span>{labels.expiresAt}</span>
                <b>{new Date(hold.expiresAt).toLocaleString('bn-BD')}</b>
              </li>
            </ul>
          </div>
        </div>
      ) : null}
    </>
  );
}
