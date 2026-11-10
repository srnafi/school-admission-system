import { Alert, Anchor, Button } from '@mantine/core';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { ApiError, api } from '../api/client';
import { StatusBadge } from '../components/StatusBadge';
import { labels, errorMessage } from '../strings';
import { useStudentId } from '../student/StudentIdContext';
import {
  AlertCircleIcon,
  ShieldCheckIcon,
  AcademicIcon,
} from '../components/icons';

export function MyHoldsPage() {
  const { studentId, isValid } = useStudentId();

  const holdsQuery = useQuery({
    queryKey: ['myHolds', studentId],
    queryFn: () => api.myHolds(studentId),
    enabled: isValid,
    refetchInterval: 5000,
  });

  const holds = holdsQuery.data ?? [];

  const focusStudentIdInput = () => {
    const el = document.getElementById('student-id-input');
    if (el) {
      el.focus();
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  return (
    <div className="desk-container">
      {/* Header */}
      <div className="desk-header">
        <div className="desk-header-info">
          <div className="desk-title-row">
            <h1 className="desk-title">{labels.myHoldsTitle}</h1>
            <span className="desk-meta-badge num">
              {holds.length ? `${holds.length}টি আবেদন দাখিল করা হয়েছে` : labels.noHolds}
            </span>
          </div>
          <p className="desk-subtitle">
            আপনার ১৭ অঙ্কের জন্ম নিবন্ধন নম্বরের অধীনে নিবন্ধিত সকল ক্লাসের আসন ও ভর্তি ফি প্রদানের অবস্থা
          </p>
        </div>

        <div className="desk-header-actions">
          <Button
            component={Link}
            to="/"
            leftSection={<AcademicIcon />}
            size="sm"
            variant="outline"
            color="blue"
          >
            {labels.navClasses} দেখুন
          </Button>
        </div>
      </div>

      {/* Student ID Missing notice */}
      {!isValid && (
        <div className="desk-notice-banner">
          <div className="notice-banner-left">
            <ShieldCheckIcon className="notice-banner-icon" />
            <div className="notice-banner-text">
              <strong>{labels.needStudentId}</strong>
              <span>আপনার পূর্ববর্তী বা চলমান আবেদন দেখতে উপরে ১৭ অঙ্কের জন্ম নিবন্ধন নম্বর দিন</span>
            </div>
          </div>
          <Button size="xs" variant="white" color="blue" onClick={focusStudentIdInput}>
            নম্বর লিখুন
          </Button>
        </div>
      )}

      {holdsQuery.isError && (
        <Alert color="red" variant="light" icon={<AlertCircleIcon />}>
          {errorMessage((holdsQuery.error as ApiError).code)}
        </Alert>
      )}

      {/* Ledger Table Panel */}
      <div className="panel desk-table-panel">
        <div className="panel-head">
          <h2 className="desk-title">{labels.myHoldsTitle}</h2>
          {holdsQuery.isFetching && (
            <div className="desk-live-tag">
              <span className="pulse-dot" /> লাইভ
            </div>
          )}
        </div>

        {holdsQuery.isLoading && (
          <div className="empty-loading-state">
            <div className="custom-loader-ring" />
            <p>{labels.loading}</p>
          </div>
        )}

        {!holdsQuery.isLoading && isValid && holds.length === 0 && (
          <div className="empty-classes-state">
            <h3>{labels.noHolds}</h3>
            <p>আপনার এই জন্ম নিবন্ধন নম্বরে এখনো কোনো ক্লাসের আসন দাবি বা ভর্তি করা হয়নি।</p>
            <Button
              component={Link}
              to="/"
              size="sm"
              color="blue"
              style={{ marginTop: '0.75rem' }}
            >
              ক্লাস তালিকা দেখুন ও আবেদন করুন
            </Button>
          </div>
        )}

        {holds.length > 0 && (
          <div className="table-responsive">
            <table className="grid-table clean-desk-table">
              <thead>
                <tr>
                  <th className="col-class-name">{labels.classNameLabel}</th>
                  <th>{labels.status}</th>
                  <th className="col-optional">{labels.holdId}</th>
                  <th className="col-optional">{labels.expiresAt}</th>
                  <th className="cell-action">ভাউচার</th>
                </tr>
              </thead>
              <tbody>
                {holds.map((item) => (
                  <tr key={item.holdId}>
                    <td>
                      <Anchor
                        component={Link}
                        to={`/holds/${item.holdId}`}
                        className="hold-title-link"
                      >
                        <strong>{item.className}</strong>
                      </Anchor>
                    </td>
                    <td>
                      <StatusBadge status={item.status} expiresAt={item.expiresAt} showCountdown />
                    </td>
                    <td className="col-optional">
                      <span className="code-text num">#{item.holdId}</span>
                    </td>
                    <td className="col-optional num">
                      <span className="text-secondary">
                        {new Date(item.expiresAt).toLocaleString('bn-BD', {
                          dateStyle: 'medium',
                          timeStyle: 'short',
                        })}
                      </span>
                    </td>
                    <td className="cell-action">
                      <Button
                        component={Link}
                        to={`/holds/${item.holdId}`}
                        size="xs"
                        variant="subtle"
                        color="blue"
                      >
                        দেখুন →
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
