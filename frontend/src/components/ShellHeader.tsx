import { Link, NavLink } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client';
import { labels, sessionLabel } from '../strings';
import { useStudentId } from '../student/StudentIdContext';

const ID_LENGTH = 17;

function Crest() {
  return (
    <svg
      viewBox="0 0 20 20"
      width="18"
      height="18"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M10 5.2c-1.3-.9-2.7-1.3-4.4-1.3v10.4c1.7 0 3.1.4 4.4 1.3 1.3-.9 2.7-1.3 4.4-1.3V3.9c-1.7 0-3.1.4-4.4 1.3Z" />
      <path d="M10 5.2v10.4" />
    </svg>
  );
}

export function ShellHeader() {
  const { studentId, setStudentId, isValid } = useStudentId();

  const holdsQuery = useQuery({
    queryKey: ['myHolds', studentId],
    queryFn: () => api.myHolds(studentId),
    enabled: isValid,
    refetchInterval: 5000,
  });

  const classesQuery = useQuery({
    queryKey: ['classes'],
    queryFn: api.listClasses,
    refetchInterval: 5000,
  });

  const classCount = classesQuery.data?.length;
  const activeHolds =
    holdsQuery.data?.filter((hold) => hold.status === 'HELD' || hold.status === 'CONFIRMED').length ?? 0;

  const typed = studentId.length;
  const state = isValid ? ' is-valid' : typed > 0 ? ' is-partial' : '';

  return (
    <header className="masthead">
      <div className="masthead-inner">
        <Link to="/" className="brand">
          <span className="brand-mark">
            <Crest />
          </span>
          <span className="brand-words">
            <span className="brand-name">{labels.title}</span>
            <span className="brand-sub">
              {labels.subtitle} · {sessionLabel()}
            </span>
          </span>
        </Link>

        <nav className="tabs" aria-label="মূল নেভিগেশন">
          <NavLink to="/" end className={({ isActive }) => `tab${isActive ? ' is-active' : ''}`}>
            {labels.navClasses}
            {classCount !== undefined && classCount > 0 && <span className="tab-count">{classCount}</span>}
          </NavLink>
          <NavLink to="/me" className={({ isActive }) => `tab${isActive ? ' is-active' : ''}`}>
            {labels.navMyHolds}
            {activeHolds > 0 && <span className="tab-count">{activeHolds}</span>}
          </NavLink>
        </nav>

        <div className={`brn${state}`}>
          <label className="brn-label" htmlFor="student-id-input">
            <span>{labels.studentId}</span>
            <span className="brn-count" aria-live="polite">
              {typed}/{ID_LENGTH}
            </span>
          </label>
          <input
            id="student-id-input"
            className="brn-input"
            type="text"
            inputMode="numeric"
            autoComplete="off"
            spellCheck={false}
            maxLength={ID_LENGTH}
            placeholder={labels.studentIdPlaceholder}
            aria-label={labels.studentId}
            value={studentId}
            onChange={(event) => setStudentId(event.currentTarget.value)}
          />
          <span className="brn-ticks" aria-hidden="true">
            {Array.from({ length: ID_LENGTH }, (_, index) => (
              <i key={index} className={index < typed ? 'is-filled' : undefined} />
            ))}
          </span>
        </div>
      </div>
    </header>
  );
}
