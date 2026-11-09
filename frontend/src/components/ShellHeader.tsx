import { TextInput } from '@mantine/core';
import { labels } from '../strings';
import { useStudentId } from '../student/StudentIdContext';

export function ShellHeader() {
  const { studentId, setStudentId, isValid } = useStudentId();

  return (
    <>
      <div className="brand">
        <span className="brand-mark" aria-hidden="true">
          ভ
        </span>
        <span className="brand-name">{labels.title}</span>
      </div>

      <TextInput
        className="identity"
        aria-label={labels.studentId}
        placeholder={`${labels.studentId} — ${labels.studentIdPlaceholder}`}
        value={studentId}
        inputMode="numeric"
        size="xs"
        error={!isValid && studentId.length > 0}
        onChange={(event) => setStudentId(event.currentTarget.value)}
      />
    </>
  );
}
