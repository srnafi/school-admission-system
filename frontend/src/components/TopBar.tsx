import { Anchor, Group, TextInput, ThemeIcon, Title } from '@mantine/core';
import { NavLink } from 'react-router-dom';
import { labels } from '../strings';
import { useStudentId } from '../student/StudentIdContext';

export function TopBar() {
  const { studentId, setStudentId, isValid } = useStudentId();

  return (
    <Group h="100%" px="lg" justify="space-between" wrap="nowrap" gap="lg">
      <Group gap="sm" wrap="nowrap">
        <ThemeIcon size={38} radius="md" variant="gradient" gradient={{ from: 'indigo', to: 'blue' }}>
          ভ
        </ThemeIcon>
        <Title order={5}>{labels.title}</Title>
      </Group>

      <TextInput
        aria-label={labels.studentId}
        label={labels.studentId}
        description={!isValid && studentId.length > 0 ? labels.studentIdHint : undefined}
        error={!isValid && studentId.length > 0}
        value={studentId}
        inputMode="numeric"
        placeholder={labels.studentIdPlaceholder}
        onChange={(event) => setStudentId(event.currentTarget.value)}
        w={280}
        size="xs"
      />

      <Group gap={4} wrap="nowrap">
        <Anchor component={NavLink} to="/" size="sm" fw={600}>
          {labels.navClasses}
        </Anchor>
        <Anchor component={NavLink} to="/me" size="sm" fw={600}>
          {labels.navMyHolds}
        </Anchor>
      </Group>
    </Group>
  );
}
