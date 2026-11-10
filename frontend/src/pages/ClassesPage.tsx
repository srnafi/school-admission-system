import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { ApiError, api } from '../api/client';
import type { ClassDto, HoldDto } from '../api/types';
import { SeatLedger } from '../components/SeatLedger';
import {
  AlertCircleIcon,
  CheckIcon,
  CopyIcon,
  PlusIcon,
  SearchIcon,
  ShieldCheckIcon,
} from '../components/icons';
import { errorMessage, labels } from '../strings';
import { useStudentId } from '../student/StudentIdContext';

type Filter = 'all' | 'available' | 'full';

const presets = [
  'Class 6 - Morning Shift',
  'Class 6 - Day Shift',
  'Class 7 - Morning Shift',
  'Class 8 - Morning Shift',
  'Class 9 - Science',
  'Class 10 - Science',
];

function focusIdentityField() {
  const field = document.getElementById('student-id-input');
  if (field) {
    field.focus();
    field.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
}

export function ClassesPage() {
  const { studentId, isValid } = useStudentId();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const [seats, setSeats] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const classesQuery = useQuery({
    queryKey: ['classes'],
    queryFn: api.listClasses,
    refetchInterval: 3000,
  });

  const createClass = useMutation<ClassDto, ApiError, void>({
    mutationFn: () => api.createClass(name.trim(), Number(seats)),
    onSuccess: async () => {
      setName('');
      setSeats('');
      setCreating(false);
      await queryClient.invalidateQueries({ queryKey: ['classes'] });
    },
  });

  const apply = useMutation<HoldDto, ApiError, ClassDto>({
    mutationFn: (target) => api.createHold(target.id, studentId),
    onSuccess: async (hold, target) => {
      await queryClient.invalidateQueries({ queryKey: ['classes'] });
      await queryClient.invalidateQueries({ queryKey: ['myHolds'] });
      navigate(`/holds/${hold.holdId}`, { state: { className: target.name } });
    },
  });

  const classes = classesQuery.data ?? [];

  const totals = useMemo(
    () =>
      classes.reduce(
        (sum, item) => ({
          capacity: sum.capacity + item.totalSeats,
          free: sum.free + item.availableSeats,
          held: sum.held + item.heldSeats,
          confirmed: sum.confirmed + item.confirmedSeats,
        }),
        { capacity: 0, free: 0, held: 0, confirmed: 0 },
      ),
    [classes],
  );

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();

    return classes.filter((item) => {
      const matches =
        term.length === 0 ||
        item.name.toLowerCase().includes(term) ||
        item.id.toLowerCase().includes(term);

      if (!matches) {
        return false;
      }

      if (filter === 'available') {
        return item.availableSeats > 0;
      }

      if (filter === 'full') {
        return item.availableSeats <= 0;
      }

      return true;
    });
  }, [classes, search, filter]);

  const seatCount = Number(seats);
  const canCreate =
    name.trim().length > 0 &&
    Number.isInteger(seatCount) &&
    seatCount > 0 &&
    seatCount <= 999 &&
    !createClass.isPending;

  const closeCreate = () => {
    setCreating(false);
    setName('');
    setSeats('');
    createClass.reset();
  };

  const copyId = (id: string) => {
    void navigator.clipboard?.writeText(id);
    setCopiedId(id);
    window.setTimeout(() => setCopiedId(null), 1600);
  };

  const resetFilters = () => {
    setSearch('');
    setFilter('all');
  };

  const counts = {
    all: classes.length,
    available: classes.filter((item) => item.availableSeats > 0).length,
    full: classes.filter((item) => item.availableSeats <= 0).length,
  };

  return (
    <div className="page">
      <section className="sheet" aria-labelledby="classes-title">
        <div className="sheet-head">
          <div>
            <h1 className="sheet-title" id="classes-title">
              {labels.navClasses}
            </h1>
            <p className="sheet-note">
              শ্রেণি ও শিফট অনুযায়ী খালি আসন। আসন নেওয়ার পর ভর্তি ফি দিতে হবে নির্ধারিত সময়ের মধ্যে।
            </p>
          </div>
          <div className="sheet-head-aside">
            <button
              type="button"
              className="btn btn-quiet"
              onClick={() => (creating ? closeCreate() : setCreating(true))}
            >
              <PlusIcon />
              {labels.createClassTitle}
            </button>
          </div>
        </div>

        <div className="rule-heavy" />

        <div className="legend">
          <div className="legend-item">
            <span className="legend-figure is-free">{totals.capacity}</span>
            <span className="legend-label">{labels.seatsTotal}</span>
          </div>
          <div className="legend-item">
            <span className="legend-swatch is-free" />
            <span className="legend-figure is-free">{totals.free}</span>
            <span className="legend-label">{labels.seatsAvailable}</span>
          </div>
          <div className="legend-item">
            <span className="legend-swatch is-held" />
            <span className="legend-figure is-held">{totals.held}</span>
            <span className="legend-label">{labels.seatsHeld}</span>
          </div>
          <div className="legend-item">
            <span className="legend-swatch is-confirmed" />
            <span className="legend-figure is-confirmed">{totals.confirmed}</span>
            <span className="legend-label">{labels.seatsConfirmed}</span>
          </div>
        </div>

        <div className="toolbar">
          <div className="search">
            <span className="search-icon">
              <SearchIcon />
            </span>
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.currentTarget.value)}
              placeholder={labels.search}
              aria-label={labels.search}
            />
          </div>

          <div className="filters" role="group" aria-label="শ্রেণি ছাঁকনি">
            {(
              [
                ['all', labels.filterAll],
                ['available', labels.filterAvailable],
                ['full', labels.filterFull],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                className={`filter${filter === value ? ' is-active' : ''}`}
                aria-pressed={filter === value}
                onClick={() => setFilter(value)}
              >
                {label}
                <span className="filter-count">{counts[value]}</span>
              </button>
            ))}
          </div>

          <div className="toolbar-end">
            <span className={`sync${classesQuery.isFetching ? ' is-fetching' : ''}`}>
              <span className="sync-dot" aria-hidden="true" />
              {labels.live}
            </span>
          </div>
        </div>

        {!isValid && (
          <div className="notice">
            <ShieldCheckIcon className="notice-icon" />
            <span>
              <strong>{labels.needStudentId}।</strong> ১৭ অঙ্কের নম্বর ছাড়া আসন নেওয়া যাবে না।
            </span>
            <button type="button" className="btn btn-quiet btn-sm" onClick={focusIdentityField}>
              নম্বর লিখুন
            </button>
          </div>
        )}

        {classesQuery.isError && (
          <div className="notice is-error">
            <AlertCircleIcon className="notice-icon" />
            <span>{errorMessage((classesQuery.error as ApiError).code)}</span>
            <button type="button" className="btn btn-quiet btn-sm" onClick={() => classesQuery.refetch()}>
              {labels.retry}
            </button>
          </div>
        )}

        {apply.isError && (
          <div className="notice is-error">
            <AlertCircleIcon className="notice-icon" />
            <span>{errorMessage((apply.error as ApiError).code)}</span>
          </div>
        )}

        <div className="chart">
          {classesQuery.isLoading ? (
            <div className="skeleton" aria-label={labels.loading}>
              {[0, 1, 2].map((row) => (
                <div key={row} className="skeleton-row">
                  <span className="skeleton-bar is-name" />
                  <span className="skeleton-bar is-seats" />
                  <span className="skeleton-bar is-figure" />
                  <span className="skeleton-bar is-button" />
                </div>
              ))}
            </div>
          ) : classesQuery.isError && classes.length === 0 ? (
            <div className="state">
              <h3>তালিকা লোড হয়নি</h3>
              <p>সার্ভারের সাথে সংযোগ করা যায়নি। কিছুক্ষণ পরে আবার চেষ্টা করুন।</p>
            </div>
          ) : classes.length === 0 && !creating ? (
            <div className="state">
              <h3>{labels.noClasses}</h3>
              <p>প্রথম শ্রেণিটি যোগ করলে অভিভাবকেরা আসন দেখতে ও আবেদন করতে পারবেন।</p>
              <button type="button" className="btn btn-primary" onClick={() => setCreating(true)}>
                <PlusIcon />
                প্রথম শ্রেণি যোগ করুন
              </button>
            </div>
          ) : filtered.length === 0 && !creating ? (
            <div className="state">
              <h3>কোনো শ্রেণি মেলেনি</h3>
              <p>খোঁজা হয়েছে “{search || labels.filterFull}” — নাম বা কোড বদলে দেখুন।</p>
              <button type="button" className="btn btn-quiet" onClick={resetFilters}>
                ফিল্টার মুছুন
              </button>
            </div>
          ) : (
            <table className="chart-table">
              <colgroup>
                <col className="c-serial" />
                <col />
                <col className="c-seats" />
                <col className="c-free" />
                <col className="c-action" />
              </colgroup>
              <thead>
                <tr>
                  <th scope="col">{labels.serial}</th>
                  <th scope="col">{labels.classNameLabel}</th>
                  <th scope="col">{labels.seatChart}</th>
                  <th scope="col" className="is-num">
                    {labels.seatsAvailable}
                  </th>
                  <th scope="col" className="is-num">
                    {labels.action}
                  </th>
                </tr>
              </thead>
              <tbody>
                {creating && (
                  <tr className="create-row">
                    <td colSpan={5}>
                      <form
                        className="create-form"
                        onSubmit={(event) => {
                          event.preventDefault();
                          if (canCreate) {
                            createClass.mutate();
                          }
                        }}
                        onKeyDown={(event) => {
                          if (event.key === 'Escape') {
                            closeCreate();
                          }
                        }}
                      >
                        <div className="presets">
                          {presets.map((preset) => (
                            <button
                              key={preset}
                              type="button"
                              className="preset"
                              onClick={() => setName(preset)}
                            >
                              {preset}
                            </button>
                          ))}
                        </div>

                        <div className="field field-name">
                          <label htmlFor="new-class-name">{labels.className}</label>
                          <input
                            id="new-class-name"
                            value={name}
                            onChange={(event) => setName(event.currentTarget.value)}
                            placeholder={labels.classNamePlaceholder}
                            autoFocus
                            required
                          />
                        </div>

                        <div className="field field-seats">
                          <label htmlFor="new-class-seats">{labels.totalSeats}</label>
                          <input
                            id="new-class-seats"
                            value={seats}
                            onChange={(event) => setSeats(event.currentTarget.value.replace(/\D/g, ''))}
                            inputMode="numeric"
                            placeholder="50"
                            required
                          />
                        </div>

                        <div className="create-actions">
                          <button type="button" className="btn btn-quiet" onClick={closeCreate}>
                            বাতিল
                          </button>
                          <button type="submit" className="btn btn-primary" disabled={!canCreate}>
                            {createClass.isPending ? 'সংরক্ষণ হচ্ছে…' : labels.createClass}
                          </button>
                        </div>

                        {createClass.isError && (
                          <p className="form-error">
                            <AlertCircleIcon className="notice-icon" />
                            {errorMessage((createClass.error as ApiError).code)}
                          </p>
                        )}
                      </form>
                    </td>
                  </tr>
                )}

                {filtered.map((item) => {
                  const serial = String(classes.indexOf(item) + 1).padStart(2, '0');
                  const isFull = item.availableSeats <= 0;
                  const applying = apply.isPending && apply.variables?.id === item.id;

                  return (
                    <tr key={item.id} className={isFull ? 'is-full' : undefined}>
                      <td className="cell-serial">{serial}</td>

                      <td className="cell-class">
                        <span className="class-name">{item.name}</span>
                        <span className="class-meta">
                          <span className="class-code">#{item.id}</span>
                          <button
                            type="button"
                            className="icon-btn"
                            onClick={() => copyId(item.id)}
                            title="কোড কপি করুন"
                            aria-label={`${item.name} কোড কপি করুন`}
                          >
                            {copiedId === item.id ? <CheckIcon /> : <CopyIcon />}
                          </button>
                        </span>
                      </td>

                      <td className="cell-seats">
                        <SeatLedger
                          total={item.totalSeats}
                          confirmed={item.confirmedSeats}
                          held={item.heldSeats}
                          available={item.availableSeats}
                        />
                      </td>

                      <td className="cell-free">
                        <span className="free-label">{labels.seatsAvailable}</span>
                        <span className={`free-figure${isFull ? ' is-zero' : ''}`}>
                          {item.availableSeats}
                          <span className="free-unit">{labels.unit}</span>
                        </span>
                      </td>

                      <td className="cell-action">
                        <button
                          type="button"
                          className={`btn btn-sm ${isFull ? 'btn-quiet' : 'btn-primary'}`}
                          disabled={!isValid || isFull || apply.isPending}
                          onClick={() => apply.mutate(item)}
                          title={!isValid ? labels.needStudentId : undefined}
                        >
                          {applying ? (
                            <>
                              <span className="btn-spinner" />
                              {labels.applying}
                            </>
                          ) : isFull ? (
                            labels.full
                          ) : (
                            labels.apply
                          )}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </section>
    </div>
  );
}
