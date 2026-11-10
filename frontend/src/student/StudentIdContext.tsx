import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { sanitizeStudentId, isValidStudentId } from './studentIdUtils';

export { sanitizeStudentId, isValidStudentId } from './studentIdUtils';

const STORAGE_KEY = 'school-admission.studentId';

export interface StudentIdValue {
  studentId: string;
  setStudentId: (value: string) => void;
  clearStudentId: () => void;
  isValid: boolean;
}

const StudentIdContext = createContext<StudentIdValue | null>(null);

export function StudentIdProvider({ children }: { children: ReactNode }) {
  const [studentId, setId] = useState(() => sanitizeStudentId(localStorage.getItem(STORAGE_KEY) ?? ''));

  const setStudentId = useCallback((value: string) => {
    const next = sanitizeStudentId(value);
    setId(next);
    localStorage.setItem(STORAGE_KEY, next);
  }, []);

  const clearStudentId = useCallback(() => {
    setId('');
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  const value = useMemo(
    () => ({
      studentId,
      setStudentId,
      clearStudentId,
      isValid: isValidStudentId(studentId),
    }),
    [studentId, setStudentId, clearStudentId],
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
