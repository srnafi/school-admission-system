import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { ApiError, api } from '../api/client';
import { StatusChip } from '../components/StatusChip';
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
    <div className="page">
      <h2>{labels.myHoldsTitle}</h2>

      {!isValid ? <p className="hint">{labels.needStudentId}</p> : null}
      {holdsQuery.isLoading ? <p className="hint">{labels.loading}</p> : null}
      {holdsQuery.isError ? <p className="error">{errorMessage((holdsQuery.error as ApiError).code)}</p> : null}
      {holdsQuery.data?.length === 0 ? <p className="hint">{labels.noHolds}</p> : null}

      <ul className="class-list">
        {holdsQuery.data?.map((item) => (
          <li key={item.holdId} className="card class-item">
            <Link to={`/holds/${item.holdId}`} className="class-name">
              {item.className}
            </Link>
            <StatusChip status={item.status} expiresAt={item.expiresAt} />
          </li>
        ))}
      </ul>
    </div>
  );
}
