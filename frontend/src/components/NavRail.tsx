import { NavLink } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { labels } from '../strings';
import { useStudentId } from '../student/StudentIdContext';
import { api } from '../api/client';
import { AcademicIcon, FileTextIcon } from './icons';

export function NavRail() {
  const { studentId, isValid } = useStudentId();

  const holdsQuery = useQuery({
    queryKey: ['myHolds', studentId],
    queryFn: () => api.myHolds(studentId),
    enabled: isValid,
    refetchInterval: 5000,
  });

  const activeHoldsCount =
    holdsQuery.data?.filter((h) => h.status === 'HELD' || h.status === 'CONFIRMED').length ?? 0;

  return (
    <div className="rail-content">
      <div className="rail-nav-group">
        <NavLink
          to="/"
          end
          className={({ isActive }) => `rail-link${isActive ? ' active' : ''}`}
        >
          <span className="rail-icon">
            <AcademicIcon />
          </span>
          <span className="rail-text">{labels.navClasses}</span>
        </NavLink>

        <NavLink
          to="/me"
          className={({ isActive }) => `rail-link${isActive ? ' active' : ''}`}
        >
          <span className="rail-icon">
            <FileTextIcon />
          </span>
          <span className="rail-text">{labels.navMyHolds}</span>
          {activeHoldsCount > 0 && (
            <span className="rail-count-badge" title="সক্রিয় আবেদন">
              {activeHoldsCount}
            </span>
          )}
        </NavLink>
      </div>

      <div className="rail-system-footer">
        <div className="system-status-indicator">
          <span className="status-dot-pulse" aria-hidden="true" />
          <span className="system-status-label">আসন ডেটা সরাসরি সংযুক্ত</span>
        </div>
        <div className="system-version-label">সংস্করণ ২.৪ · সরকারি শিক্ষা পোর্টাল</div>
      </div>
    </div>
  );
}
