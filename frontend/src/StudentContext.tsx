import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { isValidStudentId } from './utils';

interface Ctx {
  studentId: string;
  setStudentId: (s: string) => void;
  valid: boolean;
}

const StudentCtx = createContext<Ctx>({ studentId: '', setStudentId: () => {}, valid: false });

export function StudentProvider({ children }: { children: ReactNode }) {
  const [studentId, setStudentId] = useState(() => localStorage.getItem('studentId') ?? '');

  useEffect(() => {
    localStorage.setItem('studentId', studentId);
  }, [studentId]);

  return (
    <StudentCtx.Provider value={{ studentId, setStudentId, valid: isValidStudentId(studentId) }}>
      {children}
    </StudentCtx.Provider>
  );
}

export const useStudent = () => useContext(StudentCtx);
