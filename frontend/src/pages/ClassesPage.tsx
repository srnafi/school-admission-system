import { FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import { usePolling } from '../hooks';
import { useStudent } from '../StudentContext';
import { errMsg } from '../utils';
import ErrorBanner from '../components/ErrorBanner';

export default function ClassesPage() {
  const nav = useNavigate();
  const { studentId, valid } = useStudent();
  const { data: classes, error: listError, loading, refresh } = usePolling(api.listClasses, 3000);

  const [name, setName] = useState('');
  const [seats, setSeats] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  async function createClass(e: FormEvent) {
    e.preventDefault();
    setFormError(null);
    setSuccess(null);
    const n = Number(seats);
    if (!name.trim()) return setFormError('ক্লাসের নাম লিখুন।');
    if (!Number.isInteger(n) || n <= 0) return setFormError('সিট সংখ্যা ০ এর বেশি পূর্ণসংখ্যা হতে হবে।');
    setCreating(true);
    try {
      const c = await api.createClass(name.trim(), n);
      setSuccess(`"${c.name}" ক্লাস তৈরি হয়েছে।`);
      setName('');
      setSeats('');
      refresh();
    } catch (err) {
      setFormError(errMsg(err));
    } finally {
      setCreating(false);
    }
  }

  async function apply(classId: string) {
    setActionError(null);
    setBusyId(classId);
    try {
      const h = await api.apply(classId, studentId);
      nav(`/holds/${h.holdId}`);
    } catch (err: any) {
      setActionError(
        err.status === 409
          ? 'দুঃখিত, সিট শেষ হয়ে গেছে অথবা এই ক্লাসে আপনার আবেদন আগে থেকেই আছে।'
          : errMsg(err)
      );
      refresh();
    } finally {
      setBusyId(null);
    }
  }

  return (
    <>
      <section className="card">
        <div className="card__head">
          <h2>নতুন ক্লাস তৈরি</h2>
          <span className="tag">অ্যাডমিন</span>
        </div>
        <form onSubmit={createClass} className="row">
          <div className="field">
            <label htmlFor="className">ক্লাসের নাম</label>
            <input
              id="className"
              placeholder="যেমন: Class 6 - Morning Shift"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="field field--seats">
            <label htmlFor="classSeats">মোট সিট</label>
            <input
              id="classSeats"
              type="number"
              min={1}
              placeholder="120"
              value={seats}
              onChange={(e) => setSeats(e.target.value)}
            />
          </div>
          <button disabled={creating}>{creating ? 'তৈরি হচ্ছে…' : 'ক্লাস তৈরি করুন'}</button>
        </form>
        <ErrorBanner message={formError} onClose={() => setFormError(null)} />
        {success && <div className="banner success">{success}</div>}
      </section>

      <section className="card">
        <div className="card__head">
          <h2>ক্লাস তালিকা</h2>
          <span className="card__meta">
            <span className="pulse" aria-hidden="true" />
            প্রতি ৩ সেকেন্ডে হালনাগাদ
          </span>
        </div>

        {!valid && (
          <div className="banner warn">
            আবেদন করতে উপরে ১৭ অঙ্কের জন্ম নিবন্ধন নম্বর দিন।
          </div>
        )}
        <ErrorBanner message={actionError} onClose={() => setActionError(null)} />
        <ErrorBanner message={listError} />

        {loading && !classes && <p className="muted">লোড হচ্ছে…</p>}

        {classes && classes.length === 0 && (
          <div className="empty">
            <p className="empty__title">এখনো কোনো ক্লাস তৈরি হয়নি</p>
            <p className="empty__text">উপরের ফর্ম থেকে প্রথম ক্লাসটি তৈরি করুন।</p>
          </div>
        )}

        {classes && classes.length > 0 && (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>ক্লাস</th>
                  <th className="num">মোট</th>
                  <th className="num">Hold</th>
                  <th className="num">নিশ্চিত</th>
                  <th className="num">খালি</th>
                  <th>
                    <span className="sr-only">ব্যবস্থা</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {classes.map((c) => (
                  <tr key={c.id}>
                    <td data-label="ক্লাস" className="cell-name">
                      {c.name}
                    </td>
                    <td data-label="মোট" className="num">
                      {c.totalSeats}
                    </td>
                    <td data-label="Hold" className="num">
                      {c.heldSeats}
                    </td>
                    <td data-label="নিশ্চিত" className="num">
                      {c.confirmedSeats}
                    </td>
                    <td data-label="খালি" className="num">
                      <span className={`seat ${c.availableSeats === 0 ? 'seat--none' : ''}`}>
                        {c.availableSeats}
                      </span>
                    </td>
                    <td data-label="আবেদন">
                      <button
                        className="btn-sm"
                        disabled={!valid || c.availableSeats === 0 || busyId === c.id}
                        onClick={() => apply(c.id)}
                        title={
                          !valid
                            ? 'আগে জন্ম নিবন্ধন নম্বর দিন'
                            : c.availableSeats === 0
                              ? 'কোনো সিট খালি নেই'
                              : ''
                        }
                      >
                        {busyId === c.id
                          ? 'অপেক্ষা করুন…'
                          : c.availableSeats === 0
                            ? 'সিট শেষ'
                            : 'আবেদন করুন'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
