import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

const STORAGE_KEY = 'school-admission.studentId';

interface StudentIdValue {
  studentId: string;
  setStudentId: (value: string) => void;
  isValid: boolean;
}

const StudentIdContext = createContext<StudentIdValue | null>(null);

export function sanitizeStudentId(value: string): string {
  return value.replace(/\D/g, '').slice(0, 17);
}

export function isValidStudentId(value: string): boolean {
  return /^\d{17}$/.test(value);
}

export function StudentIdProvider({ children }: { children: ReactNode }) {
  const [studentId, setId] = useState(() => sanitizeStudentId(localStorage.getItem(STORAGE_KEY) ?? ''));

  const setStudentId = useCallback((value: string) => {
    const next = sanitizeStudentId(value);
    setId(next);
    localStorage.setItem(STORAGE_KEY, next);
  }, []);

  const value = useMemo(
    () => ({ studentId, setStudentId, isValid: isValidStudentId(studentId) }),
    [studentId, setStudentId],
  );

  return <StudentIdContext.Provider value={value}>{children}</StudentIdContext.Provider>;
}

export function useStudentId(): StudentIdValue {
  const context = useContext(StudentIdContext);

  if (!context) {
    throw new Error('useStudentId must be used inside StudentIdProvider');
  }

  return context;
}
