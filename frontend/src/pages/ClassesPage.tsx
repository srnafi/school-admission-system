import { useState } from 'react';
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
    <div className="page">
      <section className="card">
        <h2>{labels.createClassTitle}</h2>

        <form
          onSubmit={(event) => {
            event.preventDefault();
            if (canCreate) {
              createClass.mutate();
            }
          }}
        >
          <label>
            {labels.className}
            <input value={name} onChange={(event) => setName(event.target.value)} placeholder={labels.classNamePlaceholder} />
          </label>

          <label>
            {labels.totalSeats}
            <input
              value={seats}
              inputMode="numeric"
              onChange={(event) => setSeats(event.target.value.replace(/\D/g, ''))}
            />
          </label>

          <button type="submit" disabled={!canCreate}>
            {labels.createClass}
          </button>
        </form>

        {createClass.isError ? <p className="error">{errorMessage((createClass.error as ApiError).code)}</p> : null}
      </section>

      <section>
        <h2>{labels.navClasses}</h2>

        {!isValid ? <p className="hint">{labels.needStudentId}</p> : null}
        {classesQuery.isLoading ? <p className="hint">{labels.loading}</p> : null}
        {classesQuery.isError ? <p className="error">{errorMessage((classesQuery.error as ApiError).code)}</p> : null}
        {classesQuery.data?.length === 0 ? <p className="hint">{labels.noClasses}</p> : null}

        <ul className="class-list">
          {classesQuery.data?.map((item) => {
            const applying = apply.isPending && apply.variables?.id === item.id;

            return (
              <li key={item.id} className="card class-item">
                <div className="class-name">{item.name}</div>

                <div className="seat-counts">
                  <span>
                    {labels.seatsTotal} <b>{item.totalSeats}</b>
                  </span>
                  <span>
                    {labels.seatsHeld} <b>{item.heldSeats}</b>
                  </span>
                  <span>
                    {labels.seatsConfirmed} <b>{item.confirmedSeats}</b>
                  </span>
                  <span>
                    {labels.seatsAvailable} <b>{item.availableSeats}</b>
                  </span>
                </div>

                <button
                  type="button"
                  disabled={!isValid || item.availableSeats <= 0 || apply.isPending}
                  onClick={() => apply.mutate(item)}
                >
                  {item.availableSeats <= 0 ? labels.full : applying ? labels.applying : labels.apply}
                </button>
              </li>
            );
          })}
        </ul>

        {apply.isError ? <p className="error">{errorMessage((apply.error as ApiError).code)}</p> : null}
      </section>
    </div>
  );
}
