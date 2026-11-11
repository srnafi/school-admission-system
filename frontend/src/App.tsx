import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { CheckCircle, Clock, RefreshCw, Users, X, XCircle } from 'lucide-react';
import { api, ApiError } from './api/client';
import type { ClassDto, HoldSummaryDto } from './api/types';

const ID_LENGTH = 17;

type Tab = 'classes' | 'myapps' | 'admin';
type Selection = { kind: 'class'; classId: string } | { kind: 'hold'; holdId: string } | null;

function sanitizeId(value: string): string {
  return value.replace(/\D/g, '').slice(0, ID_LENGTH);
}

function isCompleteId(value: string): boolean {
  return value.length === ID_LENGTH;
}

function describeError(err: unknown): string {
  if (err instanceof ApiError) {
    switch (err.code) {
      case 'NO_SEATS':
        return 'This class is full. No seats are available.';
      case 'ALREADY_APPLIED':
        return 'You already have an active application for this class.';
      case 'INVALID_STUDENT_ID':
        return 'Enter a valid 17-digit Birth Registration Number.';
      case 'CLASS_NOT_FOUND':
        return 'This class no longer exists.';
      case 'HOLD_NOT_FOUND':
        return 'This application no longer exists.';
      case 'HOLD_EXPIRED':
        return 'This hold has expired.';
      case 'HOLD_NOT_ACTIVE':
        return 'This application can no longer be changed.';
      case 'FORBIDDEN':
        return 'This application belongs to another student.';
      case 'NETWORK_ERROR':
        return 'The admission server could not be reached.';
      case 'INVALID_INPUT':
        return 'Check the class name and seat count.';
      default:
        return err.message || 'Something went wrong. Try again.';
    }
  }

  return 'Something went wrong. Try again.';
}

function countdown(expiresAt: string, now: number): { label: string; expired: boolean } {
  const left = Math.max(0, new Date(expiresAt).getTime() - now);
  const seconds = Math.floor(left / 1000);

  return {
    label: `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`,
    expired: left === 0,
  };
}

const statusTone: Record<string, string> = {
  HELD: 'bg-amber-100 text-amber-800',
  CONFIRMED: 'bg-emerald-100 text-emerald-800',
  EXPIRED: 'bg-slate-200 text-slate-600',
  CANCELLED: 'bg-slate-200 text-slate-600',
};

const tabs: { id: Tab; label: string }[] = [
  { id: 'classes', label: 'Available Classes' },
  { id: 'myapps', label: 'My Applications' },
  { id: 'admin', label: 'Admin' },
];

export default function App() {
  const [studentId, setStudentId] = useState(() => sanitizeId(localStorage.getItem('studentId') ?? ''));
  const [classes, setClasses] = useState<ClassDto[]>([]);
  const [myHolds, setMyHolds] = useState<HoldSummaryDto[]>([]);
  const [tab, setTab] = useState<Tab>('classes');
  const [selection, setSelection] = useState<Selection>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [offline, setOffline] = useState(false);
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newClassName, setNewClassName] = useState('');
  const [newSeatCount, setNewSeatCount] = useState('100');
  const [refreshing, setRefreshing] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  const validStudent = isCompleteId(studentId);

  const selectedClass =
    selection?.kind === 'class' ? classes.find((item) => item.id === selection.classId) : undefined;
  const selectedHold =
    selection?.kind === 'hold' ? myHolds.find((hold) => hold.holdId === selection.holdId) : undefined;

  const holdClock = selectedHold ? countdown(selectedHold.expiresAt, now) : null;

  useEffect(() => {
    if (studentId) {
      localStorage.setItem('studentId', studentId);
    } else {
      localStorage.removeItem('studentId');
    }
  }, [studentId]);

  const loadClasses = useCallback(async () => {
    try {
      setClasses(await api.listClasses());
      setOffline(false);
    } catch (err) {
      if (err instanceof ApiError && err.code === 'NETWORK_ERROR') {
        setOffline(true);
      }
    }
  }, []);

  const loadHolds = useCallback(async (id: string) => {
    if (!isCompleteId(id)) {
      setMyHolds([]);
      return;
    }

    try {
      setMyHolds(await api.myHolds(id));
    } catch {
      /* keep the last known list */
    }
  }, []);

  useEffect(() => {
    void loadClasses();
    void loadHolds(studentId);

    const timer = setInterval(() => {
      void loadClasses();
      void loadHolds(studentId);
    }, 4000);

    return () => clearInterval(timer);
  }, [studentId, loadClasses, loadHolds]);

  const holdId = selectedHold?.holdId;
  const holdStatus = selectedHold?.status;

  useEffect(() => {
    if (!holdId || holdStatus !== 'HELD') {
      return;
    }

    const timer = setInterval(() => setNow(Date.now()), 1000);

    return () => clearInterval(timer);
  }, [holdId, holdStatus]);

  useEffect(() => {
    if (!selection) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setSelection(null);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [selection]);

  const clearMessages = () => {
    setError('');
    setNotice('');
  };

  const handleIdChange = (value: string) => {
    setStudentId(sanitizeId(value));
    clearMessages();
  };

  const refresh = async () => {
    setRefreshing(true);
    await Promise.all([loadClasses(), loadHolds(studentId)]);
    setRefreshing(false);
  };

  const createClass = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const name = newClassName.trim();
    const seats = Number(newSeatCount);

    if (!name || !Number.isInteger(seats) || seats < 1) {
      setError('Enter a class name and a seat count of at least 1.');
      return;
    }

    clearMessages();
    setSaving(true);

    try {
      await api.createClass(name, seats);
      await loadClasses();
      setNewClassName('');
      setNewSeatCount('100');
      setTab('classes');
      setNotice(`Class "${name}" created.`);
    } catch (err) {
      setError(describeError(err));
    } finally {
      setSaving(false);
    }
  };

  const applyForSeat = async (item: ClassDto) => {
    if (!validStudent) {
      setError('Enter your 17-digit Birth Registration Number before applying.');
      return;
    }

    clearMessages();
    setBusy(true);

    try {
      const hold = await api.createHold(item.id, studentId);
      await Promise.all([loadClasses(), loadHolds(studentId)]);
      setSelection({ kind: 'hold', holdId: hold.holdId });
      setNow(Date.now());
      setTab('myapps');
      setNotice('Seat held. Pay before the hold expires to confirm your admission.');
    } catch (err) {
      setError(describeError(err));
    } finally {
      setBusy(false);
    }
  };

  const confirmPayment = async (holdIdToConfirm: string) => {
    clearMessages();
    setBusy(true);

    try {
      await api.confirmHold(holdIdToConfirm, studentId);
      await Promise.all([loadHolds(studentId), loadClasses()]);
      setNotice('Payment recorded. Your admission is confirmed.');
    } catch (err) {
      setError(describeError(err));
      await loadHolds(studentId);
    } finally {
      setBusy(false);
    }
  };

  const cancelApplication = async (holdIdToCancel: string) => {
    clearMessages();
    setBusy(true);

    try {
      await api.cancelHold(holdIdToCancel, studentId);
      await Promise.all([loadHolds(studentId), loadClasses()]);
      setSelection(null);
      setNotice('Application cancelled. The seat is available again.');
    } catch (err) {
      setError(describeError(err));
    } finally {
      setBusy(false);
    }
  };

  const openHold = (hold: HoldSummaryDto) => {
    setSelection({ kind: 'hold', holdId: hold.holdId });
    setNow(Date.now());
    setTab('myapps');
  };

  const applyDisabled = !validStudent || busy;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-6 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-800 font-bold text-white">
              S
            </div>
            <div>
              <div className="text-xl font-semibold">School Admission System</div>
              <div className="text-xs text-slate-500">
                Onnorokom Prajukti Limited — First Come, First Served
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 rounded-full bg-slate-100 px-4 py-1.5">
              <Users className="h-4 w-4 text-slate-500" />
              <input
                type="text"
                inputMode="numeric"
                autoComplete="off"
                spellCheck={false}
                maxLength={ID_LENGTH}
                value={studentId}
                onChange={(event) => handleIdChange(event.currentTarget.value)}
                placeholder="17-digit Birth Registration No."
                aria-label="17-digit Birth Registration No."
                className="w-56 bg-transparent font-mono text-sm outline-none placeholder:text-slate-400"
              />
            </div>
            {studentId.length > 0 && !validStudent && (
              <span className="text-xs text-red-500">
                {studentId.length}/{ID_LENGTH}
              </span>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-8">
        {offline && (
          <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
            Can't reach the admission server. Retrying.
          </div>
        )}
        {error && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}
        {notice && (
          <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
            {notice}
          </div>
        )}

        <div className="mb-6 flex border-b">
          {tabs.map(({ id, label }) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={`px-6 py-3 font-medium ${
                tab === id ? 'border-b-2 border-blue-800 text-blue-800' : 'text-slate-500'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {tab === 'admin' && (
          <section aria-label="Admin" className="max-w-2xl">
            <h2 className="text-lg font-semibold">Create a class</h2>
            <p className="mb-4 text-sm text-slate-600">
              A new class appears in Available Classes as soon as it is created.
            </p>
            <form
              onSubmit={(event) => void createClass(event)}
              className="grid gap-4 rounded-2xl border bg-white p-6 md:grid-cols-[1fr_160px_auto]"
            >
              <label className="flex flex-col gap-1 text-sm">
                <span className="text-xs font-medium text-slate-500">Class name</span>
                <input
                  value={newClassName}
                  onChange={(event) => setNewClassName(event.currentTarget.value)}
                  placeholder="Class 8 - Morning Shift"
                  maxLength={200}
                  className="rounded-xl border px-4 py-3"
                />
              </label>
              <label className="flex flex-col gap-1 text-sm">
                <span className="text-xs font-medium text-slate-500">Total seats</span>
                <input
                  type="number"
                  min={1}
                  value={newSeatCount}
                  onChange={(event) => setNewSeatCount(event.currentTarget.value)}
                  className="rounded-xl border px-4 py-3 font-mono"
                />
              </label>
              <div className="flex items-end">
                <button
                  type="submit"
                  disabled={saving || !newClassName.trim()}
                  className="w-full rounded-xl bg-blue-800 px-6 py-3 text-white hover:bg-blue-900 disabled:bg-slate-300"
                >
                  {saving ? 'Creating…' : 'Create Class'}
                </button>
              </div>
            </form>
          </section>
        )}

        {tab === 'classes' && (
          <section aria-label="Available classes">
            <div className="mb-4 flex items-center justify-between">
              <div className="font-medium">All Classes — Live Seat Status (auto-refreshes every 4s)</div>
              <button
                type="button"
                onClick={() => void refresh()}
                className="flex items-center gap-1 text-sm text-blue-700"
              >
                <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} /> Refresh
              </button>
            </div>

            {classes.length === 0 ? (
              <div className="rounded-2xl border bg-white px-6 py-16 text-center text-slate-500">
                No classes have been created yet.
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
                {classes.map((item) => (
                  <article key={item.id} className="rounded-2xl border bg-white p-6 transition hover:shadow-sm">
                    <div className="mb-1 text-lg font-semibold">{item.name}</div>
                    <div className="mb-4 text-xs text-slate-500">Total Seats: {item.totalSeats}</div>

                    <div className="mb-6 grid grid-cols-3 gap-2 text-center text-sm">
                      <div>
                        <div className="font-mono text-xl font-semibold text-emerald-600">{item.availableSeats}</div>
                        <div className="text-[10px] text-slate-500">AVAILABLE</div>
                      </div>
                      <div>
                        <div className="font-mono text-xl font-semibold text-amber-600">{item.heldSeats}</div>
                        <div className="text-[10px] text-slate-500">HELD</div>
                      </div>
                      <div>
                        <div className="font-mono text-xl font-semibold text-blue-600">{item.confirmedSeats}</div>
                        <div className="text-[10px] text-slate-500">CONFIRMED</div>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setSelection({ kind: 'class', classId: item.id })}
                        className="flex-1 rounded-xl border py-2 text-sm hover:bg-slate-50"
                      >
                        View Details
                      </button>
                      <button
                        type="button"
                        onClick={() => void applyForSeat(item)}
                        disabled={applyDisabled || item.availableSeats === 0}
                        className="flex-1 rounded-xl bg-blue-800 py-2 text-sm text-white hover:bg-blue-900 disabled:bg-slate-300"
                      >
                        {item.availableSeats === 0 ? 'Class Full' : 'Apply Now'}
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        )}

        {tab === 'myapps' && (
          <section aria-label="My applications">
            {!validStudent ? (
              <div className="py-16 text-center text-slate-500">
                Enter your 17-digit Birth Registration Number to view your applications.
              </div>
            ) : myHolds.length === 0 ? (
              <div className="py-16 text-center text-slate-500">You have no applications yet.</div>
            ) : (
              <ul className="space-y-3">
                {myHolds.map((hold) => (
                  <li key={hold.holdId}>
                    <button
                      type="button"
                      onClick={() => openHold(hold)}
                      className="flex w-full items-center justify-between rounded-2xl border bg-white p-6 text-left hover:border-blue-300"
                    >
                      <div>
                        <div className="font-medium">{hold.className}</div>
                        <div className="text-sm text-slate-500">Hold ID: {hold.holdId}</div>
                      </div>
                      <div className="flex items-center gap-6 text-sm">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-medium ${
                            statusTone[hold.status] ?? 'bg-slate-200 text-slate-600'
                          }`}
                        >
                          {hold.status}
                        </span>
                        {hold.status === 'HELD' && (
                          <span className="flex items-center gap-1 font-mono text-amber-600">
                            <Clock className="h-4 w-4" />
                            {new Date(hold.expiresAt).toLocaleTimeString()}
                          </span>
                        )}
                        <span className="text-xs text-blue-700">View →</span>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}
      </main>

      {selection && (selectedClass || selectedHold) && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
          onClick={() => setSelection(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label={selectedClass ? selectedClass.name : 'Application status'}
            className="w-full max-w-md rounded-3xl bg-white p-8"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <div className="text-2xl font-semibold">
                  {selectedClass ? selectedClass.name : 'Application Status'}
                </div>
                <div className="text-sm text-slate-500">
                  {selectedClass ? 'Seat Status' : selectedHold?.className}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelection(null)}
                aria-label="Close"
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {selectedClass && (
              <>
                <div className="mb-8 grid grid-cols-2 gap-y-4 text-sm">
                  <div>Total Seats</div>
                  <div className="text-right font-mono">{selectedClass.totalSeats}</div>
                  <div>Available</div>
                  <div className="text-right font-mono text-emerald-600">{selectedClass.availableSeats}</div>
                  <div>Held</div>
                  <div className="text-right font-mono text-amber-600">{selectedClass.heldSeats}</div>
                  <div>Confirmed</div>
                  <div className="text-right font-mono text-blue-600">{selectedClass.confirmedSeats}</div>
                </div>

                <button
                  type="button"
                  onClick={() => void applyForSeat(selectedClass)}
                  disabled={applyDisabled || selectedClass.availableSeats === 0}
                  className="w-full rounded-2xl bg-blue-800 py-3 text-white hover:bg-blue-900 disabled:bg-slate-300"
                >
                  {selectedClass.availableSeats === 0 ? 'Class Full' : 'Apply for this Class'}
                </button>
              </>
            )}

            {selectedHold && (
              <>
                <div className="mb-8 space-y-4">
                  <div className="flex justify-between">
                    <span>Status</span>
                    <span className="font-mono text-lg font-semibold">{selectedHold.status}</span>
                  </div>
                  {selectedHold.status === 'HELD' && holdClock && (
                    <div className="flex justify-between text-amber-600">
                      <span>Expires in</span>
                      <span className="font-mono text-2xl font-semibold tracking-tight">
                        {holdClock.expired ? 'Expired' : holdClock.label}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between text-xs text-slate-500">
                    <span>Expires At</span>
                    <span>{new Date(selectedHold.expiresAt).toLocaleString()}</span>
                  </div>
                </div>

                {selectedHold.status === 'HELD' && (
                  <div className="space-y-3">
                    <button
                      type="button"
                      onClick={() => void confirmPayment(selectedHold.holdId)}
                      disabled={busy || Boolean(holdClock?.expired)}
                      className="flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-600 py-3 text-white hover:bg-emerald-700 disabled:bg-slate-300"
                    >
                      <CheckCircle className="h-4 w-4" /> Pay Admission Fee &amp; Confirm
                    </button>
                    <button
                      type="button"
                      onClick={() => void cancelApplication(selectedHold.holdId)}
                      disabled={busy}
                      className="flex w-full items-center justify-center gap-2 rounded-2xl border py-3 text-red-600 hover:bg-red-50 disabled:text-slate-400"
                    >
                      <XCircle className="h-4 w-4" /> Cancel Application
                    </button>
                  </div>
                )}

                {selectedHold.status === 'CONFIRMED' && (
                  <div className="py-3 text-center text-emerald-700">Admission confirmed</div>
                )}
                {selectedHold.status === 'EXPIRED' && (
                  <div className="py-3 text-center text-red-600">This hold has expired</div>
                )}
                {selectedHold.status === 'CANCELLED' && (
                  <div className="py-3 text-center text-slate-500">This application was cancelled</div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
