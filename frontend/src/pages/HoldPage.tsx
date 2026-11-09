import { Alert, Anchor, Button, Card, Group, Stack, Text, Title } from '@mantine/core';
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
    <Stack gap="lg">
      <Anchor component={Link} to="/" size="sm">
        ← {labels.backToClasses}
      </Anchor>

      {holdQuery.isLoading ? <Text c="dimmed">{labels.loading}</Text> : null}

      {holdQuery.isError ? (
        <Alert color="red" variant="light">
          {errorMessage((holdQuery.error as ApiError).code)}
        </Alert>
      ) : null}

      {hold ? (
        <Card withBorder radius="md" padding="lg" shadow="sm">
          <Group justify="space-between" align="flex-start" wrap="nowrap">
            <Title order={3}>{className ?? `${labels.classNameLabel} ${hold.classId}`}</Title>
            <StatusBadge status={hold.status} expiresAt={hold.expiresAt} />
          </Group>

          {status === 'HELD' ? (
            <div style={{ marginTop: '1.25rem' }}>
              <Text size="xs" c="dimmed">
                {labels.timeLeft}
              </Text>
              <Text fz={44} fw={800} lh={1.1} className="mono" c="indigo.7">
                {formatRemaining(remaining)}
              </Text>
            </div>
          ) : null}

          <Group gap="sm" mt="lg">
            <Button
              disabled={!isValid || status !== 'HELD'}
              loading={confirm.isPending}
              onClick={() => confirm.mutate()}
            >
              {labels.pay}
            </Button>
            <Button
              variant="light"
              color="red"
              disabled={!isValid || status !== 'HELD'}
              loading={cancel.isPending}
              onClick={() => cancel.mutate()}
            >
              {labels.cancel}
            </Button>
          </Group>

          {status === 'CONFIRMED' ? (
            <Alert color="teal" variant="light" mt="lg">
              আপনার ভর্তি নিশ্চিত হয়েছে
            </Alert>
          ) : null}
          {status === 'EXPIRED' ? (
            <Alert color="gray" variant="light" mt="lg">
              আসনটি ছেড়ে দেওয়া হয়েছে
            </Alert>
          ) : null}
          {status === 'CANCELLED' ? (
            <Alert color="red" variant="light" mt="lg">
              আবেদনটি বাতিল করা হয়েছে
            </Alert>
          ) : null}

          {confirm.isError ? (
            <Alert color="red" variant="light" mt="md">
              {errorMessage((confirm.error as ApiError).code)}
            </Alert>
          ) : null}
          {cancel.isError ? (
            <Alert color="red" variant="light" mt="md">
              {errorMessage((cancel.error as ApiError).code)}
            </Alert>
          ) : null}
        </Card>
      ) : null}
    </Stack>
  );
}
