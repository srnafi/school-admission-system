import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../api';
import { usePolling, useNow } from '../hooks';
import { useStudent } from '../StudentContext';
import { effectiveStatus, errMsg, formatRemaining } from '../utils';
import ErrorBanner from '../components/ErrorBanner';
import StatusBadge from '../components/StatusBadge';

export default function HoldPage() {
  const { holdId = '' } = useParams();
  const { studentId, valid } = useStudent();
  const now = useNow();
  const { data: hold, error, loading, refresh } = usePolling(() => api.getHold(holdId), 5000, [holdId]);
  const [classes] = [usePolling(api.listClasses, 10000).data];
  const [actionError, setActionError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState<'pay' | 'cancel' | null>(null);

  const status = hold ? effectiveStatus(hold.status, hold.expiresAt, now) : undefined;
  const className = classes?.find((c) => c.id === hold?.classId)?.name;

  // When the local timer reaches zero, sync once with the server
  const synced = useRef(false);
  useEffect(() => {
    if (hold?.status === 'HELD' && status === 'EXPIRED' && !synced.current) {
      synced.current = true;
      refresh();
    }
  }, [status, hold?.status, refresh]);

  async function pay() {
    setActionError(null);
    setNotice(null);
    setBusy('pay');
    try {
      await api.confirm(holdId, studentId);
      setNotice('ভর্তি ফি জমা সফল হয়েছে। আপনার ভর্তি নিশ্চিত হয়েছে।');
    } catch (e: any) {
      setActionError(
        e.status === 409 || e.status === 410
          ? 'আবেদনের মেয়াদ শেষ হয়ে গেছে অথবা আবেদনটি আর সক্রিয় নেই।'
          : e.status === 403
            ? 'এই আবেদনটি আপনার জন্ম নিবন্ধন নম্বরের নয়।'
            : errMsg(e)
      );
    } finally {
      setBusy(null);
      refresh();
    }
  }

  async function cancel() {
    if (!window.confirm('আপনি কি আবেদনটি বাতিল করতে চান?')) return;
    setActionError(null);
    setNotice(null);
    setBusy('cancel');
    try {
      await api.cancel(holdId, studentId);
      setNotice('আবেদন বাতিল করা হয়েছে।');
    } catch (e) {
      setActionError(errMsg(e));
    } finally {
      setBusy(null);
      refresh();
    }
  }

  const active = status === 'HELD';
  const remainingMs = hold ? Date.parse(hold.expiresAt) - now : 0;

  return (
    <section className="card">
      <p className="backlink">
        <Link to="/me">← আমার আবেদন</Link>
      </p>
      <h2>আবেদনের বিস্তারিত</h2>

      <ErrorBanner message={error} />
      <ErrorBanner message={actionError} onClose={() => setActionError(null)} />
      {notice && <div className="banner success">{notice}</div>}
      {loading && !hold && <p className="muted">লোড হচ্ছে…</p>}

      {hold && status && (
        <>
          <dl className="details">
            <dt>ক্লাস</dt>
            <dd>{className ?? hold.classId}</dd>
            <dt>আবেদন আইডি</dt>
            <dd className="mono">{hold.holdId}</dd>
            <dt>অবস্থা</dt>
            <dd>
              <StatusBadge status={status} />
            </dd>
            {active && (
              <>
                <dt>বাকি সময়</dt>
                <dd>
                  <span className={`timer ${remainingMs < 60000 ? 'urgent' : ''}`}>
                    {formatRemaining(hold.expiresAt, now)}
                  </span>
                </dd>
              </>
            )}
            <dt>মেয়াদ শেষ</dt>
            <dd>{new Date(hold.expiresAt).toLocaleString('bn-BD')}</dd>
          </dl>

          {status === 'EXPIRED' && (
            <div className="banner warn">
              মেয়াদ শেষ হয়ে গেছে। সিটটি অন্যদের জন্য খালি হয়ে গেছে। নতুন করে আবেদন করুন।
            </div>
          )}
          {status === 'CANCELLED' && !notice && (
            <div className="banner warn">এই আবেদনটি বাতিল করা হয়েছে।</div>
          )}
          {status === 'CONFIRMED' && !notice && (
            <div className="banner success">ভর্তি নিশ্চিত হয়েছে।</div>
          )}
          {!valid && active && (
            <div className="banner warn">কাজ করতে উপরে জন্ম নিবন্ধন নম্বর দিন।</div>
          )}

          <div className="row actions">
            <button disabled={!active || !valid || busy !== null} onClick={pay}>
              {busy === 'pay' ? 'প্রক্রিয়াধীন…' : 'ভর্তি ফি দিন'}
            </button>
            <button
              className="danger"
              disabled={!active || !valid || busy !== null}
              onClick={cancel}
            >
              {busy === 'cancel' ? 'বাতিল হচ্ছে…' : 'বাতিল'}
            </button>
          </div>
        </>
      )}
    </section>
  );
}
