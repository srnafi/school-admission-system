import { NavLink, Link, Outlet } from 'react-router-dom';
import { useStudent } from '../StudentContext';
import { usePolling, useNow } from '../hooks';
import { api } from '../api';
import { effectiveStatus, formatRemaining } from '../utils';

export default function Layout() {
  const { studentId, setStudentId, valid } = useStudent();
  const now = useNow();

  // Restores the in-progress application after a refresh / browser restart
  const { data: mine } = usePolling(
    () => (valid ? api.myHolds(studentId) : Promise.resolve([])),
    5000,
    [studentId, valid]
  );
  const active = mine?.find((h) => effectiveStatus(h.status, h.expiresAt, now) === 'HELD');

  return (
    <>
      <header className="header">
        <div className="header__bar">
          <div className="brand">
            <span className="brand__seal" aria-hidden="true">
              উ
            </span>
            <div className="brand__text">
              <h1>স্কুল ভর্তি সিস্টেম</h1>
              <p>অনলাইন আসন সংরক্ষণ ও ভর্তি নিশ্চিতকরণ</p>
            </div>
          </div>

          <div className="student">
            <label htmlFor="sid">শিক্ষার্থীর জন্ম নিবন্ধন নম্বর (১৭ অঙ্ক)</label>
            <input
              id="sid"
              inputMode="numeric"
              maxLength={17}
              value={studentId}
              placeholder="20152691234567890"
              aria-invalid={studentId.length > 0 && !valid}
              onChange={(e) => setStudentId(e.target.value.replace(/\D/g, ''))}
            />
            {studentId && !valid && (
              <small className="err-text">
                নম্বরটি অবশ্যই ১৭ অঙ্কের হতে হবে ({studentId.length}/১৭)
              </small>
            )}
          </div>
        </div>

        <nav className="nav">
          <NavLink to="/" end>
            ক্লাস তালিকা
          </NavLink>
          <NavLink to="/me">আমার আবেদন</NavLink>
        </nav>
      </header>

      {active && (
        <div className="banner info">
          <span>
            আপনার একটি চলমান আবেদন আছে ({active.className}) — বাকি সময়:{' '}
            <b className="banner__timer">{formatRemaining(active.expiresAt, now)}</b>
          </span>
          <Link to={`/holds/${active.holdId}`}>বিস্তারিত দেখুন →</Link>
        </div>
      )}

      <main className="container">
        <Outlet />
      </main>

      <footer className="footer">
        <span>স্কুল ভর্তি সিস্টেম</span>
        <span>সহায়তা প্রয়োজন হলে বিদ্যালয়ের অফিসে যোগাযোগ করুন।</span>
      </footer>
    </>
  );
}
