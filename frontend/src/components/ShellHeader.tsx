import { TextInput, Tooltip, ActionIcon } from '@mantine/core';
import { NavLink } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { labels } from '../strings';
import { useStudentId } from '../student/StudentIdContext';
import { api } from '../api/client';
import {
  CheckIcon,
  CloseIcon,
  ShieldCheckIcon,
  AcademicIcon,
  FileTextIcon,
} from './icons';

export function ShellHeader() {
  const { studentId, setStudentId, clearStudentId, isValid } = useStudentId();

  const holdsQuery = useQuery({
    queryKey: ['myHolds', studentId],
    queryFn: () => api.myHolds(studentId),
    enabled: isValid,
    refetchInterval: 5000,
  });

  const activeHoldsCount =
    holdsQuery.data?.filter((h) => h.status === 'HELD' || h.status === 'CONFIRMED').length ?? 0;

  const count = studentId.length;
  const isComplete = isValid;
  const isIncomplete = count > 0 && !isComplete;

  return (
    <div className="header-inner">
      {/* Brand Section */}
      <div className="brand">
        <NavLink to="/" className="brand-link">
          <div className="brand-crest" aria-hidden="true">
            <svg viewBox="0 0 32 32" fill="none" className="brand-crest-svg">
              <path
                d="M16 2L4 6.5V15C4 22.5 9.2 28.8 16 30C22.8 28.8 28 22.5 28 15V6.5L16 2Z"
                fill="#1e3a8a"
                stroke="#3b82f6"
                strokeWidth="1.5"
              />
              <path d="M16 7L8 11.5L16 16L24 11.5L16 7Z" fill="#ffffff" />
              <path
                d="M11 13.5V18.5C11 18.5 12.8 20.5 16 20.5C19.2 20.5 21 18.5 21 18.5V13.5"
                stroke="#ffffff"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
          </div>
          <div className="brand-text">
            <span className="brand-name">{labels.title}</span>
            <span className="brand-subtitle">অনলাইন ভর্তি ও আসন ট্র্যাকার</span>
          </div>
        </NavLink>
      </div>

      {/* Desktop Main Navigation Tabs */}
      <nav className="desktop-nav-tabs" aria-label="মূল নেভিগেশন">
        <NavLink
          to="/"
          end
          className={({ isActive }) => `desktop-nav-tab${isActive ? ' is-active' : ''}`}
        >
          <span className="nav-tab-icon">
            <AcademicIcon />
          </span>
          <span className="nav-tab-label">{labels.navClasses}</span>
        </NavLink>

        <NavLink
          to="/me"
          className={({ isActive }) => `desktop-nav-tab${isActive ? ' is-active' : ''}`}
        >
          <span className="nav-tab-icon">
            <FileTextIcon />
          </span>
          <span className="nav-tab-label">{labels.navMyHolds}</span>
          {activeHoldsCount > 0 && (
            <span className="nav-tab-count" title="সক্রিয় আবেদন">
              {activeHoldsCount}
            </span>
          )}
        </NavLink>
      </nav>

      {/* Identity & Status Right Section */}
      <div className="header-right-tools">
        <div className="identity-wrapper">
          <Tooltip
            label={
              isComplete
                ? '১৭ অঙ্কের জন্ম নিবন্ধন নম্বর যাচাইকৃত'
                : isIncomplete
                  ? `আরও ${17 - count}টি অঙ্ক বাকি রয়েছে (মোট ১৭ অঙ্ক)`
                  : 'ভর্তির জন্য শিক্ষার্থীর ১৭ অঙ্কের অনলাইন জন্ম নিবন্ধন নম্বর আবশ্যক'
            }
            position="bottom-end"
            withArrow
            transitionProps={{ duration: 150 }}
          >
            <div className="identity-container">
              <TextInput
                id="student-id-input"
                className={`identity-input${isComplete ? ' is-valid' : ''}${
                  isIncomplete ? ' is-incomplete' : ''
                }`}
                aria-label={labels.studentId}
                placeholder={`${labels.studentId} (${labels.studentIdPlaceholder})`}
                value={studentId}
                inputMode="numeric"
                size="sm"
                leftSection={
                  isComplete ? (
                    <ShieldCheckIcon className="identity-status-icon is-valid" />
                  ) : (
                    <span className="identity-status-label">BRN</span>
                  )
                }
                rightSection={
                  <div className="identity-actions">
                    {count > 0 && (
                      <ActionIcon
                        size="xs"
                        variant="subtle"
                        color="gray"
                        onClick={clearStudentId}
                        title="মুছে ফেলুন"
                        aria-label="নম্বর মুছুন"
                      >
                        <CloseIcon />
                      </ActionIcon>
                    )}
                    {isComplete ? (
                      <span className="identity-badge is-valid" title="যাচাইকৃত">
                        <CheckIcon /> ১৭
                      </span>
                    ) : (
                      <span
                        className={`identity-badge${isIncomplete ? ' is-warning' : ''}`}
                        title={`${count} / 17`}
                      >
                        {count}/17
                      </span>
                    )}
                  </div>
                }
                rightSectionWidth={count > 0 ? 82 : 56}
                onChange={(event) => setStudentId(event.currentTarget.value)}
              />
            </div>
          </Tooltip>
        </div>

        <div className="desktop-live-status col-optional">
          <span className="live-pulse-dot" aria-hidden="true" />
          <span className="live-status-text">সরাসরি ডেটাবেস সংযোগ</span>
        </div>
      </div>
    </div>
  );
}
