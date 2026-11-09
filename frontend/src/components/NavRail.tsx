import { NavLink } from 'react-router-dom';
import { labels } from '../strings';

export function NavRail() {
  return (
    <>
      <NavLink to="/" end className={({ isActive }) => `rail-link${isActive ? ' active' : ''}`}>
        {labels.navClasses}
      </NavLink>
      <NavLink to="/me" className={({ isActive }) => `rail-link${isActive ? ' active' : ''}`}>
        {labels.navMyHolds}
      </NavLink>
    </>
  );
}
