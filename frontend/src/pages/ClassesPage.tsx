import { useState } from 'react';
import { Alert, Button, Loader, TextInput } from '@mantine/core';
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

  const classes = classesQuery.data ?? [];
  const freeSeats = classes.reduce((total, item) => total + item.availableSeats, 0);

  return (
    <>
      <div className="panel">
        <div className="panel-head">
          <h2 className="panel-title">{labels.createClassTitle}</h2>
        </div>

        <form
          className="create-row"
          onSubmit={(event) => {
            event.preventDefault();
            if (canCreate) {
              createClass.mutate();
            }
          }}
        >
          <TextInput
            label={labels.className}
            placeholder={labels.classNamePlaceholder}
            value={name}
            onChange={(event) => setName(event.currentTarget.value)}
          />
          <TextInput
            label={labels.totalSeats}
            value={seats}
            inputMode="numeric"
            onChange={(event) => setSeats(event.currentTarget.value.replace(/\D/g, ''))}
          />
          <Button type="submit" disabled={!canCreate} loading={createClass.isPending}>
            {labels.createClass}
          </Button>
        </form>

        {createClass.isError ? (
          <Alert color="red" variant="light" m="sm">
            {errorMessage((createClass.error as ApiError).code)}
          </Alert>
        ) : null}
      </div>

      <div className="panel">
        <div className="panel-head">
          <h2 className="panel-title">{labels.navClasses}</h2>
          <span className="panel-note">
            {classes.length ? `${classes.length}টি ক্লাস · ${freeSeats}টি আসন খালি` : labels.noClasses}
            {classesQuery.isFetching ? <Loader size={14} ml="sm" /> : null}
          </span>
        </div>

        {!isValid ? (
          <Alert color="blue" variant="light" radius={0}>
            {labels.needStudentId}
          </Alert>
        ) : null}

        {classesQuery.isError ? (
          <Alert color="red" variant="light" radius={0}>
            {errorMessage((classesQuery.error as ApiError).code)}
          </Alert>
        ) : null}

        {classesQuery.isLoading ? <div className="empty">{labels.loading}</div> : null}

        {!classesQuery.isLoading && classes.length === 0 ? <div className="empty">{labels.noClasses}</div> : null}

        {classes.length > 0 ? (
          <table className="grid-table">
            <thead>
              <tr>
                <th>{labels.classNameLabel}</th>
                <th className="cell-num col-optional">{labels.seatsTotal}</th>
                <th className="cell-num col-optional">{labels.seatsHeld}</th>
                <th className="cell-num">{labels.seatsConfirmed}</th>
                <th className="cell-num">{labels.seatsAvailable}</th>
                <th className="cell-action" />
              </tr>
            </thead>
            <tbody>
              {classes.map((item) => {
                const applying = apply.isPending && apply.variables?.id === item.id;
                const occupied = Math.round(((item.totalSeats - item.availableSeats) / item.totalSeats) * 100);

                return (
                  <tr key={item.id}>
                    <td>
                      <div className="cell-name">
                        <strong>{item.name}</strong>
                        <span className="cell-id">{item.id}</span>
                      </div>
                    </td>
                    <td className="cell-num col-optional num">{item.totalSeats}</td>
                    <td className="cell-num col-optional num">{item.heldSeats}</td>
                    <td className="cell-num num">{item.confirmedSeats}</td>
                    <td className="cell-num">
                      <div className="capacity">
                        <span className="num">{item.availableSeats}</span>
                        <span className="capacity-track">
                          <span
                            className={`capacity-fill${item.availableSeats === 0 ? ' is-full' : ''}`}
                            style={{ width: `${occupied}%` }}
                          />
                        </span>
                      </div>
                    </td>
                    <td className="cell-action">
                      <Button
                        size="xs"
                        variant={item.availableSeats > 0 ? 'filled' : 'default'}
                        disabled={!isValid || item.availableSeats <= 0 || apply.isPending}
                        loading={applying}
                        onClick={() => apply.mutate(item)}
                      >
                        {item.availableSeats <= 0 ? labels.full : labels.apply}
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : null}

        {apply.isError ? (
          <Alert color="red" variant="light" radius={0}>
            {errorMessage((apply.error as ApiError).code)}
          </Alert>
        ) : null}
      </div>
    </>
  );
}
