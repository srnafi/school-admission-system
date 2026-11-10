import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ApiError, api } from '../api/client';
import { StatusStamp } from '../components/StatusStamp';
import { AlertCircleIcon, ArrowRightIcon, ShieldCheckIcon } from '../components/icons';
import { errorMessage, labels } from '../strings';
import { useStudentId } from '../student/StudentIdContext';
import { formatDateTime } from '../utils/datetime';

function focusIdentityField() {
  const field = document.getElementById('student-id-input');
  if (field) {
    field.focus();
    field.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
}

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
    <div className="page">
      <section className="sheet" aria-labelledby="holds-title">
        <div className="sheet-head">
          <div>
            <h1 className="sheet-title" id="holds-title">
              {labels.myHoldsTitle}
            </h1>
            <p className="sheet-note">
              {isValid ? (
                <>
                  জন্ম নিবন্ধন <span className="mono">{studentId}</span> নম্বরে দাখিল করা সব আবেদন ও তাদের
                  অবস্থা।
                </>
              ) : (
                'নম্বর দিলে এই তালিকায় আপনার সব আবেদন দেখা যাবে।'
              )}
            </p>
          </div>
          <div className="sheet-head-aside">
            <Link to="/" className="btn btn-quiet">
              {labels.navClasses}
            </Link>
          </div>
        </div>

        <div className="rule-heavy" />

        {!isValid && (
          <div className="notice">
            <ShieldCheckIcon className="notice-icon" />
            <span>
              <strong>{labels.needStudentId}।</strong> নম্বরটি ছাড়া আবেদনের তালিকা দেখা যায় না।
            </span>
            <button type="button" className="btn btn-quiet btn-sm" onClick={focusIdentityField}>
              নম্বর লিখুন
            </button>
          </div>
        )}

        {holdsQuery.isError && (
          <div className="notice is-error">
            <AlertCircleIcon className="notice-icon" />
            <span>{errorMessage((holdsQuery.error as ApiError).code)}</span>
            <button type="button" className="btn btn-quiet btn-sm" onClick={() => holdsQuery.refetch()}>
              {labels.retry}
            </button>
          </div>
        )}

        {isValid && holdsQuery.isLoading && (
          <div className="skeleton" aria-label={labels.loading}>
            {[0, 1, 2].map((row) => (
              <div key={row} className="skeleton-row">
                <span className="skeleton-bar is-name" />
                <span className="skeleton-bar is-seats" />
                <span className="skeleton-bar is-button" />
              </div>
            ))}
          </div>
        )}

        {isValid && !holdsQuery.isLoading && holds.length === 0 && (
          <div className="state">
            <h3>{labels.noHolds}</h3>
            <p>ক্লাস তালিকা থেকে আসন নিলে আবেদনটি এখানে দেখা যাবে।</p>
            <Link to="/" className="btn btn-primary">
              ক্লাস তালিকা দেখুন
            </Link>
          </div>
        )}

        {holds.length > 0 && (
          <table className="holds-table">
            <colgroup>
              <col className="c-serial" />
              <col />
              <col className="col-status" />
              <col className="col-id" />
              <col className="col-time" />
              <col className="col-go" />
            </colgroup>
            <thead>
              <tr>
                <th scope="col">{labels.serial}</th>
                <th scope="col">{labels.classNameLabel}</th>
                <th scope="col">{labels.status}</th>
                <th scope="col">{labels.holdId}</th>
                <th scope="col">{labels.expiresAt}</th>
                <th scope="col" className="is-num">
                  {labels.details}
                </th>
              </tr>
            </thead>
            <tbody>
              {holds.map((hold, index) => (
                <tr key={hold.holdId}>
                  <td className="cell-serial">{String(index + 1).padStart(2, '0')}</td>

                  <td className="col-class">
                    <Link to={`/holds/${hold.holdId}`} className="class-name">
                      {hold.className}
                    </Link>
                  </td>

                  <td className="col-status">
                    <StatusStamp status={hold.status} expiresAt={hold.expiresAt} showTimer />
                  </td>

                  <td className="col-id">
                    <span className="muted-mono">#{hold.holdId}</span>
                  </td>

                  <td className="col-time">
                    <span className="muted-mono">{formatDateTime(hold.expiresAt)}</span>
                  </td>

                  <td className="col-go">
                    <Link
                      to={`/holds/${hold.holdId}`}
                      className="icon-btn"
                      aria-label={`${hold.className} আবেদনটি দেখুন`}
                    >
                      <ArrowRightIcon />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
