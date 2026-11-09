import { Alert, Anchor } from '@mantine/core';
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

  const holds = holdsQuery.data ?? [];

  return (
    <div className="panel">
      <div className="panel-head">
        <h1 className="page-title">{labels.myHoldsTitle}</h1>
        <span className="panel-note">{holds.length ? `${holds.length}টি আবেদন` : labels.noHolds}</span>
      </div>

      {!isValid ? (
        <Alert color="blue" variant="light" radius={0}>
          {labels.needStudentId}
        </Alert>
      ) : null}

      {holdsQuery.isError ? (
        <Alert color="red" variant="light" radius={0}>
          {errorMessage((holdsQuery.error as ApiError).code)}
        </Alert>
      ) : null}

      {holdsQuery.isLoading ? <div className="empty">{labels.loading}</div> : null}

      {!holdsQuery.isLoading && isValid && holds.length === 0 ? <div className="empty">{labels.noHolds}</div> : null}

      {holds.length > 0 ? (
        <table className="grid-table">
          <thead>
            <tr>
              <th>{labels.classNameLabel}</th>
              <th>{labels.status}</th>
              <th className="col-optional">{labels.holdId}</th>
              <th className="col-optional">{labels.expiresAt}</th>
            </tr>
          </thead>
          <tbody>
            {holds.map((item) => (
              <tr key={item.holdId}>
                <td>
                  <Anchor component={Link} to={`/holds/${item.holdId}`} fw={600} size="sm" c="inherit">
                    {item.className}
                  </Anchor>
                </td>
                <td>
                  <StatusBadge status={item.status} expiresAt={item.expiresAt} />
                </td>
                <td className="col-optional">
                  <span className="cell-id">{item.holdId}</span>
                </td>
                <td className="col-optional num">
                  {new Date(item.expiresAt).toLocaleString('bn-BD')}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : null}
    </div>
  );
}
