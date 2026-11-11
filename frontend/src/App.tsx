import { useCallback, useEffect, useState } from 'react';
import { Clock, RefreshCw, Users } from 'lucide-react';
import { api, ApiError } from './api/client';
import type { ClassDto, HoldSummaryDto } from './api/types';

const ID_LENGTH = 17;

type Tab = 'classes' | 'myapps';

function sanitizeId(value: string): string {
  return value.replace(/\D/g, '').slice(0, ID_LENGTH);
}

function isCompleteId(value: string): boolean {
  return value.length === ID_LENGTH;
}

const statusTone: Record<string, string> = {
  HELD: 'bg-amber-100 text-amber-800',
  CONFIRMED: 'bg-emerald-100 text-emerald-800',
  EXPIRED: 'bg-slate-200 text-slate-600',
  CANCELLED: 'bg-slate-200 text-slate-600',
};

export default function App() {
  const [studentId, setStudentId] = useState(() => sanitizeId(localStorage.getItem('studentId') ?? ''));
  const [classes, setClasses] = useState<ClassDto[]>([]);
  const [myHolds, setMyHolds] = useState<HoldSummaryDto[]>([]);
  const [tab, setTab] = useState<Tab>('classes');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [offline, setOffline] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const validStudent = isCompleteId(studentId);

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

  const refresh = async () => {
    setRefreshing(true);
    await Promise.all([loadClasses(), loadHolds(studentId)]);
    setRefreshing(false);
  };

  const handleIdChange = (value: string) => {
    setStudentId(sanitizeId(value));
    setError('');
    setNotice('');
  };

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
          <button
            type="button"
            onClick={() => setTab('classes')}
            className={`px-6 py-3 font-medium ${
              tab === 'classes' ? 'border-b-2 border-blue-800 text-blue-800' : 'text-slate-500'
            }`}
          >
            Available Classes
          </button>
          <button
            type="button"
            onClick={() => setTab('myapps')}
            className={`px-6 py-3 font-medium ${
              tab === 'myapps' ? 'border-b-2 border-blue-800 text-blue-800' : 'text-slate-500'
            }`}
          >
            My Applications
          </button>
        </div>

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

                    <div className="mb-2 grid grid-cols-3 gap-2 text-center text-sm">
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
                  <li
                    key={hold.holdId}
                    className="flex items-center justify-between rounded-2xl border bg-white p-6"
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
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}
      </main>
    </div>
  );
}
