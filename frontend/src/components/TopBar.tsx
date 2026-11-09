import { NavLink } from 'react-router-dom';
import { labels } from '../strings';
import { useStudentId } from '../student/StudentIdContext';

export function TopBar() {
  const { studentId, setStudentId, isValid } = useStudentId();

  return (
    <header className="topbar">
      <h1>{labels.title}</h1>

      <div className="student-id">
        <label htmlFor="student-id">{labels.studentId}</label>
        <input
          id="student-id"
          value={studentId}
          inputMode="numeric"
          placeholder={labels.studentIdPlaceholder}
          onChange={(event) => setStudentId(event.target.value)}
          aria-invalid={!isValid && studentId.length > 0}
        />
        {!isValid && studentId.length > 0 ? <small className="hint">{labels.studentIdHint}</small> : null}
      </div>

      <nav>
        <NavLink to="/">{labels.navClasses}</NavLink>
        <NavLink to="/me">{labels.navMyHolds}</NavLink>
      </nav>
    </header>
  );
}
