import { useState } from 'react';
import {
  Alert,
  Badge,
  Button,
  Card,
  Group,
  Loader,
  Progress,
  SimpleGrid,
  Stack,
  Text,
  TextInput,
  Title,
} from '@mantine/core';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { ApiError, api } from '../api/client';
import type { ClassDto } from '../api/types';
import { labels, errorMessage } from '../strings';
import { useStudentId } from '../student/StudentIdContext';

export function ClassesPage() {
  const { studentId, isValid } = useStudentId();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [name, setName] = useState('');
  const [seats, setSeats] = useState('');

  const classesQuery = useQuery({
    queryKey: ['classes'],
    queryFn: api.listClasses,
    refetchInterval: 3000,
  });

  const createClass = useMutation({
    mutationFn: () => api.createClass(name.trim(), Number(seats)),
    onSuccess: async () => {
      setName('');
      setSeats('');
      await queryClient.invalidateQueries({ queryKey: ['classes'] });
    },
  });

  const apply = useMutation({
    mutationFn: (target: ClassDto) => api.createHold(target.id, studentId),
    onSuccess: async (hold, target) => {
      await queryClient.invalidateQueries({ queryKey: ['classes'] });
      await queryClient.invalidateQueries({ queryKey: ['myHolds'] });
      navigate(`/holds/${hold.holdId}`, { state: { className: target.name } });
    },
  });

  const seatCount = Number(seats);
  const canCreate = name.trim().length > 0 && Number.isInteger(seatCount) && seatCount > 0 && !createClass.isPending;

  return (
    <Stack gap="lg">
      <Card withBorder radius="md" padding="lg">
        <Title order={4} mb="md">
          {labels.createClassTitle}
        </Title>

        <form
          onSubmit={(event) => {
            event.preventDefault();
            if (canCreate) {
              createClass.mutate();
            }
          }}
        >
          <Group align="flex-end" gap="md" wrap="wrap">
            <TextInput
              label={labels.className}
              placeholder={labels.classNamePlaceholder}
              value={name}
              onChange={(event) => setName(event.currentTarget.value)}
              style={{ flex: '1 1 18rem' }}
            />
            <TextInput
              label={labels.totalSeats}
              value={seats}
              inputMode="numeric"
              onChange={(event) => setSeats(event.currentTarget.value.replace(/\D/g, ''))}
              w={140}
            />
            <Button type="submit" disabled={!canCreate} loading={createClass.isPending}>
              {labels.createClass}
            </Button>
          </Group>
        </form>

        {createClass.isError ? (
          <Alert color="red" variant="light" mt="md">
            {errorMessage((createClass.error as ApiError).code)}
          </Alert>
        ) : null}
      </Card>

      <div>
        <Group justify="space-between" mb="sm">
          <Title order={4}>{labels.navClasses}</Title>
          {classesQuery.isFetching ? <Loader size="xs" /> : null}
        </Group>

        {!isValid ? (
          <Alert color="blue" variant="light" mb="md">
            {labels.needStudentId}
          </Alert>
        ) : null}

        {classesQuery.isError ? (
          <Alert color="red" variant="light" mb="md">
            {errorMessage((classesQuery.error as ApiError).code)}
          </Alert>
        ) : null}

        {classesQuery.isLoading ? <Text c="dimmed">{labels.loading}</Text> : null}

        {classesQuery.data?.length === 0 ? <Text c="dimmed">{labels.noClasses}</Text> : null}

        <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="md">
          {classesQuery.data?.map((item) => {
            const applying = apply.isPending && apply.variables?.id === item.id;
            const occupied = Math.round(((item.totalSeats - item.availableSeats) / item.totalSeats) * 100);

            return (
              <Card key={item.id} withBorder radius="md" padding="md" shadow="sm">
                <Group justify="space-between" align="flex-start" mb="sm" wrap="nowrap">
                  <Text fw={600} lh={1.35}>
                    {item.name}
                  </Text>
                  <Badge color={item.availableSeats > 0 ? 'teal' : 'red'} variant="light">
                    {item.availableSeats > 0 ? `${item.availableSeats} ${labels.seatsAvailable}` : labels.full}
                  </Badge>
                </Group>

                <SimpleGrid cols={4} spacing="xs" mb="sm">
                  <div>
                    <Text size="xs" c="dimmed">
                      {labels.seatsTotal}
                    </Text>
                    <Text fw={700}>{item.totalSeats}</Text>
                  </div>
                  <div>
                    <Text size="xs" c="dimmed">
                      {labels.seatsHeld}
                    </Text>
                    <Text fw={700}>{item.heldSeats}</Text>
                  </div>
                  <div>
                    <Text size="xs" c="dimmed">
                      {labels.seatsConfirmed}
                    </Text>
                    <Text fw={700}>{item.confirmedSeats}</Text>
                  </div>
                  <div>
                    <Text size="xs" c="dimmed">
                      {labels.seatsAvailable}
                    </Text>
                    <Text fw={700}>{item.availableSeats}</Text>
                  </div>
                </SimpleGrid>

                <Progress value={occupied} size="sm" radius="xl" mb="md" color="indigo" />

                <Button
                  fullWidth
                  disabled={!isValid || item.availableSeats <= 0 || apply.isPending}
                  loading={applying}
                  onClick={() => apply.mutate(item)}
                >
                  {item.availableSeats <= 0 ? labels.full : labels.apply}
                </Button>
              </Card>
            );
          })}
        </SimpleGrid>

        {apply.isError ? (
          <Alert color="red" variant="light" mt="md">
            {errorMessage((apply.error as ApiError).code)}
          </Alert>
        ) : null}
      </div>
    </Stack>
  );
}
