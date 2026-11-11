import { Link } from 'react-router-dom';
import { api } from '../api';
import { usePolling, useNow } from '../hooks';
import { useStudent } from '../StudentContext';
import { effectiveStatus, formatRemaining } from '../utils';
import ErrorBanner from '../components/ErrorBanner';
import StatusBadge from '../components/StatusBadge';

export default function MyHoldsPage() {
  const { studentId, valid } = useStudent();
  const now = useNow();
  const { data, error, loading } = usePolling(
    () => (valid ? api.myHolds(studentId) : Promise.resolve([])),
    5000,
    [studentId, valid]
  );

  return (
    <section className="card">
      <div className="card__head">
        <h2>আমার আবেদনসমূহ</h2>
        <span className="card__meta">
          <span className="pulse" aria-hidden="true" />
          প্রতি ৫ সেকেন্ডে হালনাগাদ
        </span>
      </div>

      {!valid && (
        <div className="banner warn">
          আপনার আবেদন দেখতে ১৭ অঙ্কের জন্ম নিবন্ধন নম্বর দিন।
        </div>
      )}
      <ErrorBanner message={error} />

      {valid && loading && !data && <p className="muted">লোড হচ্ছে…</p>}

      {valid && data && data.length === 0 && (
        <div className="empty">
          <p className="empty__title">কোনো আবেদন নেই</p>
          <p className="empty__text">
            <Link to="/">ক্লাস তালিকা</Link> থেকে পছন্দের ক্লাসে আবেদন করুন।
          </p>
        </div>
      )}

      {data && data.length > 0 && (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>ক্লাস</th>
                <th>অবস্থা</th>
                <th>বাকি সময়</th>
                <th>
                  <span className="sr-only">বিস্তারিত</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {data.map((h) => {
                const st = effectiveStatus(h.status, h.expiresAt, now);
                return (
                  <tr key={h.holdId}>
                    <td data-label="ক্লাস" className="cell-name">
                      {h.className}
                    </td>
                    <td data-label="অবস্থা">
                      <StatusBadge status={st} />
                    </td>
                    <td data-label="বাকি সময়" className="num">
                      {st === 'HELD' ? formatRemaining(h.expiresAt, now) : '—'}
                    </td>
                    <td data-label="বিস্তারিত">
                      <Link className="btn-link" to={`/holds/${h.holdId}`}>
                        বিস্তারিত
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
