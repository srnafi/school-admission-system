import { Alert, Anchor, Card, Table, Text, Title } from '@mantine/core';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { ApiError, api } from '../api/client';
import { StatusBadge } from '../components/StatusBadge';
import { labels, errorMessage } from '../strings';
import { useStudentId } from '../student/StudentIdContext';

export function MyHoldsPage() {
  const { studentId, isValid } = useStudentId();

  const holdsQuery = useQuery({
    queryKey: ['myHolds', studentId],
    queryFn: () => api.myHolds(studentId),
    enabled: isValid,
    refetchInterval: 5000,
  });

  return (
    <Card withBorder radius="md" padding="lg">
      <Title order={4} mb="md">
        {labels.myHoldsTitle}
      </Title>

      {!isValid ? (
        <Alert color="blue" variant="light">
          {labels.needStudentId}
        </Alert>
      ) : null}

      {holdsQuery.isError ? (
        <Alert color="red" variant="light">
          {errorMessage((holdsQuery.error as ApiError).code)}
        </Alert>
      ) : null}

      {holdsQuery.isLoading ? <Text c="dimmed">{labels.loading}</Text> : null}

      {holdsQuery.data?.length === 0 ? <Text c="dimmed">{labels.noHolds}</Text> : null}

      {holdsQuery.data && holdsQuery.data.length > 0 ? (
        <Table striped highlightOnHover withTableBorder>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>{labels.classNameLabel}</Table.Th>
              <Table.Th>{labels.status}</Table.Th>
              <Table.Th>{labels.navMyHolds}</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {holdsQuery.data.map((item) => (
              <Table.Tr key={item.holdId}>
                <Table.Td>
                  <Anchor component={Link} to={`/holds/${item.holdId}`} fw={600}>
                    {item.className}
                  </Anchor>
                </Table.Td>
                <Table.Td>
                  <StatusBadge status={item.status} expiresAt={item.expiresAt} />
                </Table.Td>
                <Table.Td>
                  <Text size="xs" c="dimmed" className="mono">
                    {item.holdId}
                  </Text>
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      ) : null}
    </Card>
  );
}
