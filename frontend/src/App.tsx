import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { CheckCircle, ChevronDown, Clock, Info, Users, X, XCircle } from 'lucide-react';
import { api, ApiError } from './api/client';
import type { ClassDto, HoldSummaryDto } from './api/types';
import { LanguageSwitch } from './components/LanguageSwitch';
import { errorKey, type MessageKey, type Translate } from './i18n/catalog';
import { useI18n } from './i18n/useI18n';

const ID_LENGTH = 17;

type Tab = 'classes' | 'myapps' | 'admin';
type Selection = { kind: 'class'; classId: string } | { kind: 'hold'; holdId: string } | null;

function sanitizeId(value: string): string {
  return value.replace(/\D/g, '').slice(0, ID_LENGTH);
}

function isCompleteId(value: string): boolean {
  return value.length === ID_LENGTH;
}

function describeError(err: unknown, t: Translate): string {
  if (err instanceof ApiError) {
    switch (err.code) {
      case 'NO_SEATS':
      case 'ALREADY_APPLIED':
      case 'INVALID_STUDENT_ID':
      case 'CLASS_NOT_FOUND':
      case 'HOLD_NOT_FOUND':
      case 'HOLD_EXPIRED':
      case 'HOLD_NOT_ACTIVE':
      case 'FORBIDDEN':
      case 'NETWORK_ERROR':
      case 'INVALID_INPUT':
      case 'CLASS_EXISTS':
      case 'SEATS_IN_USE':
        return t(errorKey(err.code));
      default:
        return t('error.generic');
    }
  }

  return t('error.generic');
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

const tabs: { id: Tab; labelKey: MessageKey; shortLabelKey: MessageKey }[] = [
  { id: 'classes', labelKey: 'tab.classes', shortLabelKey: 'tab.classesShort' },
  { id: 'myapps', labelKey: 'tab.myapps', shortLabelKey: 'tab.myapps' },
  { id: 'admin', labelKey: 'tab.admin', shortLabelKey: 'tab.admin' },
];

const classNumbers = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10'];
const shiftOptions: { value: string; labelKey: MessageKey }[] = [
  { value: 'Morning', labelKey: 'admin.shiftMorning' },
  { value: 'Day', labelKey: 'admin.shiftDay' },
];

function classNumberLabel(number: string, t: Translate): string {
  return t('admin.classOption', { n: number });
}

interface SelectMenuProps {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
}

function SelectMenu({ label, value, options, onChange }: SelectMenuProps) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    const onPointerDown = (event: PointerEvent) => {
      if (root.current && !root.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
        trigger.current?.focus();
      }
    };

    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);

    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  const selected = options.find((option) => option.value === value);

  return (
    <div ref={root} className="relative flex flex-col gap-1 text-sm">
      <span className="text-xs font-medium text-slate-500">{label}</span>
      <button
        ref={trigger}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`${label}: ${selected?.label ?? value}`}
        onClick={() => setOpen((current) => !current)}
        className="flex w-full items-center justify-between gap-2 rounded-xl border bg-white px-3 py-3 text-left"
      >
        <span>{selected?.label ?? value}</span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-slate-500 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <div
          role="listbox"
          aria-label={label}
          className="absolute inset-x-0 top-full z-30 mt-1 max-h-72 overflow-y-auto rounded-xl border border-slate-200 bg-white py-1 shadow-lg"
        >
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              role="option"
              aria-selected={option.value === value}
              onClick={() => {
                onChange(option.value);
                setOpen(false);
                trigger.current?.focus();
              }}
              className={`block w-full px-3 py-2 text-left text-sm hover:bg-slate-100 ${
                option.value === value ? 'bg-blue-50 font-medium text-blue-800' : ''
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

const classNameOrder = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });

function sortClassesDesc(items: ClassDto[], applied: Set<string>): ClassDto[] {
  return [...items].sort((a, b) => {
    const appliedA = applied.has(a.id);
    const appliedB = applied.has(b.id);

    if (appliedA !== appliedB) {
      return appliedA ? 1 : -1;
    }

    return classNameOrder.compare(b.name, a.name);
  });
}

type ToastTone = 'success' | 'error' | 'warning';

interface Toast {
  id: number;
  tone: ToastTone;
  text: string;
}

const toastTone: Record<ToastTone, { box: string; icon: typeof CheckCircle; iconClass: string }> = {
  success: {
    box: 'border-emerald-200 bg-emerald-50 text-emerald-800',
    icon: CheckCircle,
    iconClass: 'text-emerald-600',
  },
  error: {
    box: 'border-red-200 bg-red-50 text-red-700',
    icon: XCircle,
    iconClass: 'text-red-600',
  },
  warning: {
    box: 'border-amber-200 bg-amber-50 text-amber-800',
    icon: Info,
    iconClass: 'text-amber-600',
  },
};

function ToastView({ toast, onDismiss }: { toast: Toast; onDismiss: (id: number) => void }) {
  const tone = toastTone[toast.tone];
  const Icon = tone.icon;
  const { t } = useI18n();

  return (
    <div
      role={toast.tone === 'error' ? 'alert' : 'status'}
      className={`pointer-events-auto flex w-full max-w-md items-start gap-3 rounded-xl border px-4 py-3 shadow-lg ${tone.box}`}
    >
      <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${tone.iconClass}`} />
      <p className="flex-1 text-sm">{toast.text}</p>
      <button
        type="button"
        onClick={() => onDismiss(toast.id)}
        aria-label={t('toast.dismiss')}
        className="rounded p-0.5 opacity-60 hover:opacity-100"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

export default function App() {
  const { t } = useI18n();
  const [studentId, setStudentId] = useState(() => sanitizeId(localStorage.getItem('studentId') ?? ''));
  const [classes, setClasses] = useState<ClassDto[]>([]);
  const [myHolds, setMyHolds] = useState<HoldSummaryDto[]>([]);
  const [tab, setTab] = useState<Tab>('classes');
  const [selection, setSelection] = useState<Selection>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [presetClassNo, setPresetClassNo] = useState('6');
  const [presetShift, setPresetShift] = useState('Morning');
  const [presetSeats, setPresetSeats] = useState<string | null>(null);
  const [customOpen, setCustomOpen] = useState(false);
  const [newClassName, setNewClassName] = useState('');
  const [newSeatCount, setNewSeatCount] = useState('100');
  const [now, setNow] = useState(() => Date.now());
  const toastSeq = useRef(0);
  const offline = useRef(false);

  const validStudent = isCompleteId(studentId);

  const selectedClass =
    selection?.kind === 'class' ? classes.find((item) => item.id === selection.classId) : undefined;
  const selectedHold =
    selection?.kind === 'hold' ? myHolds.find((hold) => hold.holdId === selection.holdId) : undefined;

  const holdClock = selectedHold ? countdown(selectedHold.expiresAt, now) : null;
  const appliedHolds = new Map(
    myHolds
      .filter((hold) => hold.status === 'HELD' || hold.status === 'CONFIRMED')
      .map((hold) => [hold.classId, hold]),
  );
  const sortedClasses = sortClassesDesc(classes, new Set(appliedHolds.keys()));
  const selectedClassHold = selectedClass ? appliedHolds.get(selectedClass.id) : undefined;
  const presetName = `Class ${presetClassNo} - ${presetShift} Shift`;
  const presetMatch = classes.find(
    (item) => item.name.toLowerCase() === presetName.toLowerCase(),
  );
  const presetTaken = presetMatch ? presetMatch.heldSeats + presetMatch.confirmedSeats : 0;
  const presetSeatsValue = presetSeats ?? (presetMatch ? String(presetMatch.totalSeats) : '100');
  const customName = newClassName.trim();
  const customMatch = customName
    ? classes.find((item) => item.name.toLowerCase() === customName.toLowerCase())
    : undefined;

  useEffect(() => {
    if (studentId) {
      localStorage.setItem('studentId', studentId);
    } else {
      localStorage.removeItem('studentId');
    }
  }, [studentId]);

  const dismissToast = (id: number) => {
    setToasts((list) => list.filter((toast) => toast.id !== id));
  };

  const pushToast = useCallback((tone: ToastTone, text: string) => {
    toastSeq.current += 1;
    const id = toastSeq.current;

    setToasts((list) => [...list, { id, tone, text }]);

    if (tone === 'success') {
      setTimeout(() => {
        setToasts((list) => list.filter((toast) => toast.id !== id));
      }, 6000);
    }
  }, []);

  const loadClasses = useCallback(async () => {
    try {
      setClasses(await api.listClasses());
      offline.current = false;
    } catch (err) {
      if (err instanceof ApiError && err.code === 'NETWORK_ERROR' && !offline.current) {
        offline.current = true;
        pushToast('warning', t('toast.offline'));
      }
    }
  }, [pushToast, t]);

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

  const handleIdChange = (value: string) => {
    setStudentId(sanitizeId(value));
  };

  const createClass = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const name = newClassName.trim();
    const seats = Number(newSeatCount);

    if (!name || !Number.isInteger(seats) || seats < 1) {
      pushToast('error', t('toast.classNameRequired'));
      return;
    }

    if (customMatch) {
      pushToast('error', t('toast.duplicateClass', { name }));
      return;
    }

    setSaving(true);

    try {
      await api.createClass(name, seats);
      await loadClasses();
      setNewClassName('');
      setNewSeatCount('100');
      setTab('classes');
      pushToast('success', t('toast.classCreated', { name }));
    } catch (err) {
      pushToast('error', describeError(err, t));
    } finally {
      setSaving(false);
    }
  };

  const savePresetClass = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const seats = Number(presetSeatsValue);
    if (!Number.isInteger(seats) || seats < 1) {
      pushToast('error', t('toast.seatsMin'));
      return;
    }

    if (presetMatch && seats < presetTaken) {
      pushToast('error', t('toast.seatsBelow', { taken: presetTaken }));
      return;
    }

    setSaving(true);

    try {
      if (presetMatch) {
        await api.updateClass(presetMatch.id, presetName, seats);
        await loadClasses();
        setTab('classes');
        pushToast('success', t('toast.classUpdated', { name: presetName }));
      } else {
        await api.createClass(presetName, seats);
        await loadClasses();
        setTab('classes');
        pushToast('success', t('toast.classCreated', { name: presetName }));
      }
    } catch (err) {
      pushToast('error', describeError(err, t));
    } finally {
      setSaving(false);
    }
  };

  const applyForSeat = async (item: ClassDto) => {
    if (!validStudent) {
      pushToast('error', t('toast.enterBrn'));
      return;
    }

    setBusy(true);

    try {
      const hold = await api.createHold(item.id, studentId);
      await Promise.all([loadClasses(), loadHolds(studentId)]);
      setSelection({ kind: 'hold', holdId: hold.holdId });
      setNow(Date.now());
      setTab('myapps');
      pushToast('success', t('toast.seatHeld'));
    } catch (err) {
      pushToast('error', describeError(err, t));
    } finally {
      setBusy(false);
    }
  };

  const confirmPayment = async (holdIdToConfirm: string) => {
    setBusy(true);

    try {
      await api.confirmHold(holdIdToConfirm, studentId);
      await Promise.all([loadHolds(studentId), loadClasses()]);
      pushToast('success', t('toast.payment'));
    } catch (err) {
      pushToast('error', describeError(err, t));
      await loadHolds(studentId);
    } finally {
      setBusy(false);
    }
  };

  const cancelApplication = async (holdIdToCancel: string) => {
    setBusy(true);

    try {
      await api.cancelHold(holdIdToCancel, studentId);
      await Promise.all([loadHolds(studentId), loadClasses()]);
      setSelection(null);
      pushToast('success', t('toast.cancelled'));
    } catch (err) {
      pushToast('error', describeError(err, t));
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
        <div className="mx-auto flex max-w-6xl flex-col px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-800 font-bold text-white">
              S
            </div>
            <div>
              <div className="text-xl font-semibold">{t('app.title')}</div>
              <div className="text-xs text-slate-500">{t('app.subtitle')}</div>
            </div>
            <LanguageSwitch className="ml-1 shrink-0" />
          </div>

          <div className="mt-4 flex w-full flex-col gap-1.5 sm:mt-0 sm:w-auto">
            <label
              htmlFor="student-id"
              className="text-[11px] font-semibold uppercase tracking-wide text-slate-500"
            >
              {t('id.label')}
            </label>
            <div
              className={`flex items-center gap-2 rounded-xl border bg-white px-4 py-2.5 transition-colors focus-within:border-blue-700 ${
                validStudent ? 'border-emerald-600' : 'border-slate-300'
              }`}
            >
              <Users className="h-5 w-5 shrink-0 text-slate-400" />
              <input
                id="student-id"
                type="text"
                inputMode="numeric"
                autoComplete="off"
                spellCheck={false}
                maxLength={ID_LENGTH}
                value={studentId}
                aria-label={t('id.aria')}
                onChange={(event) => handleIdChange(event.currentTarget.value)}
                placeholder={t('id.placeholder')}
                className="w-full min-w-0 bg-transparent font-mono text-base outline-none placeholder:text-slate-400 sm:w-64"
              />
              <span
                className={`shrink-0 font-mono text-xs ${
                  validStudent ? 'text-emerald-700' : 'text-slate-400'
                }`}
              >
                {studentId.length}/{ID_LENGTH}
              </span>
            </div>
            {studentId.length > 0 && !validStudent && (
              <span className="text-xs text-red-500">{t('id.incomplete')}</span>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 pb-28 pt-6 sm:px-6 sm:pb-8 sm:pt-8">
        <nav
          aria-label={t('nav.sections')}
          className="fixed inset-x-0 bottom-0 z-40 flex justify-center px-4 pb-4 sm:static sm:mb-6 sm:justify-start sm:border-b sm:px-0 sm:pb-0"
        >
          <div className="flex w-full max-w-md items-center gap-1 rounded-2xl border border-slate-200 bg-white/95 p-1.5 shadow-lg backdrop-blur sm:w-auto sm:max-w-none sm:gap-0 sm:rounded-none sm:border-0 sm:bg-transparent sm:p-0 sm:shadow-none sm:backdrop-blur-none">
            {tabs.map(({ id, labelKey, shortLabelKey }) => {
              const label = t(labelKey);
              const shortLabel = t(shortLabelKey);

              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setTab(id)}
                  aria-current={tab === id ? 'page' : undefined}
                  className={`flex-1 rounded-xl px-3 py-2.5 text-xs font-medium transition-colors duration-200 ease-in sm:flex-none sm:rounded-none sm:px-6 sm:py-3 sm:text-sm ${
                    tab === id
                      ? 'bg-blue-800 text-white sm:border-b-2 sm:border-blue-800 sm:bg-transparent sm:text-blue-800'
                      : 'text-slate-600 sm:text-slate-500'
                  }`}
                >
                  {shortLabel === label ? (
                    label
                  ) : (
                    <>
                      <span className="sm:hidden">{shortLabel}</span>
                      <span className="hidden sm:inline">{label}</span>
                    </>
                  )}
                </button>
              );
            })}
          </div>
        </nav>

        {tab === 'admin' && (
          <section aria-label={t('tab.admin')} className="max-w-3xl">
            <h2 className="text-lg font-semibold">{t('admin.title')}</h2>
            <p className="mb-4 text-sm text-slate-600">
              {presetMatch
                ? t('admin.noteExisting', {
                    name: presetName,
                    total: presetMatch.totalSeats,
                    taken: presetTaken,
                  })
                : t('admin.noteNew')}
            </p>

            <form
              onSubmit={(event) => void savePresetClass(event)}
              className="grid gap-4 rounded-2xl border bg-white p-6 sm:grid-cols-[140px_150px_1fr_auto]"
            >
              <SelectMenu
                label={t('admin.class')}
                value={presetClassNo}
                options={classNumbers.map((number) => ({
                  value: number,
                  label: classNumberLabel(number, t),
                }))}
                onChange={(value) => {
                  setPresetClassNo(value);
                  setPresetSeats(null);
                }}
              />
              <SelectMenu
                label={t('admin.shift')}
                value={presetShift}
                options={shiftOptions.map((option) => ({
                  value: option.value,
                  label: t(option.labelKey),
                }))}
                onChange={(value) => {
                  setPresetShift(value);
                  setPresetSeats(null);
                }}
              />
              <label className="flex flex-col gap-1 text-sm">
                <span className="text-xs font-medium text-slate-500">{t('admin.seats')}</span>
                <input
                  type="number"
                  min={Math.max(1, presetTaken)}
                  value={presetSeatsValue}
                  onChange={(event) => setPresetSeats(event.currentTarget.value)}
                  className="rounded-xl border px-4 py-3 font-mono"
                />
              </label>
              <div className="flex items-end">
                <button
                  type="submit"
                  disabled={saving}
                  className="w-full rounded-xl bg-blue-800 px-6 py-3 text-white hover:bg-blue-900 disabled:bg-slate-300"
                >
                  {saving
                    ? t('admin.saving')
                    : presetMatch
                      ? t('admin.update')
                      : t('admin.create')}
                </button>
              </div>
            </form>

            <div className="mt-6 border-t border-slate-200 pt-4">
              <button
                type="button"
                onClick={() => setCustomOpen((open) => !open)}
                aria-expanded={customOpen}
                className="text-xs text-slate-400 underline underline-offset-2 hover:text-slate-600"
              >
                {customOpen ? t('admin.hideCustom') : t('admin.showCustom')}
              </button>

              {customOpen && (
                <form
                  onSubmit={(event) => void createClass(event)}
                  className="mt-3 grid gap-3 rounded-xl border border-dashed border-slate-300 bg-slate-50/70 p-4 sm:grid-cols-[1fr_140px_auto]"
                >
                  <div className="flex flex-col gap-1 text-sm">
                    <label
                      htmlFor="custom-class-name"
                      className="text-xs font-medium text-slate-500"
                    >
                      {t('admin.customName')}
                    </label>
                    <input
                      id="custom-class-name"
                      value={newClassName}
                      onChange={(event) => setNewClassName(event.currentTarget.value)}
                      placeholder={t('admin.customPlaceholder')}
                      maxLength={200}
                      className="rounded-xl border bg-white px-3 py-2"
                    />
                  </div>
                  <label className="flex flex-col gap-1 text-sm">
                    <span className="text-xs font-medium text-slate-500">{t('admin.totalSeats')}</span>
                    <input
                      type="number"
                      min={1}
                      value={newSeatCount}
                      onChange={(event) => setNewSeatCount(event.currentTarget.value)}
                      className="rounded-xl border bg-white px-3 py-2 font-mono"
                    />
                  </label>
                  <div className="flex items-end">
                    <button
                      type="submit"
                      disabled={saving || !newClassName.trim() || Boolean(customMatch)}
                      className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm text-slate-700 hover:bg-slate-100 disabled:text-slate-400"
                    >
                      {saving ? t('admin.creating') : t('admin.createCustom')}
                    </button>
                  </div>

                  {customMatch && (
                    <p className="text-xs text-amber-700 sm:col-span-3">{t('admin.duplicate')}</p>
                  )}
                </form>
              )}
            </div>
          </section>
        )}

        {tab === 'classes' && (
          <section aria-label={t('tab.classes')}>
            <div className="mb-4 font-medium">{t('classes.all')}</div>

            {classes.length === 0 ? (
              <div className="rounded-2xl border bg-white px-6 py-16 text-center text-slate-500">
                {t('classes.empty')}
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
                {sortedClasses.map((item) => {
                  const activeHold = appliedHolds.get(item.id);

                  return (
                    <article key={item.id} className="rounded-2xl border bg-white p-6 transition hover:shadow-sm">
                      <div className="mb-1 flex items-start justify-between gap-2">
                        <div className="text-lg font-semibold">{item.name}</div>
                        {activeHold && (
                          <span
                            className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                              activeHold.status === 'CONFIRMED'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {t('classes.alreadyApplied')}
                          </span>
                        )}
                      </div>
                      <div className="mb-4 text-xs text-slate-500">
                        {t('classes.total', { count: item.totalSeats })}
                      </div>

                      <div className="mb-6 grid grid-cols-3 gap-2 text-center text-sm">
                        <div>
                          <div className="font-mono text-2xl font-semibold text-emerald-600">{item.availableSeats}</div>
                          <div className="text-[10px] text-slate-500">{t('classes.available')}</div>
                        </div>
                        <div>
                          <div className="font-mono text-2xl font-semibold text-amber-600">{item.heldSeats}</div>
                          <div className="text-[10px] text-slate-500">{t('classes.held')}</div>
                        </div>
                        <div>
                          <div className="font-mono text-2xl font-semibold text-blue-600">{item.confirmedSeats}</div>
                          <div className="text-[10px] text-slate-500">{t('classes.confirmed')}</div>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setSelection({ kind: 'class', classId: item.id })}
                          className="flex-1 rounded-xl border py-2 text-sm hover:bg-slate-50"
                        >
                          {t('classes.viewDetails')}
                        </button>
                        {activeHold ? (
                          <button
                            type="button"
                            onClick={() => openHold(activeHold)}
                            className="flex-1 rounded-xl border py-2 text-sm text-blue-700 hover:bg-slate-50"
                          >
                            {t('classes.viewApplication')}
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => void applyForSeat(item)}
                            disabled={applyDisabled || item.availableSeats === 0}
                            className="flex-1 rounded-xl bg-blue-800 py-2 text-sm text-white hover:bg-blue-900 disabled:bg-slate-300"
                          >
                            {item.availableSeats === 0
                              ? t('classes.classFull')
                              : t('classes.applyNow')}
                          </button>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        )}

        {tab === 'myapps' && (
          <section aria-label={t('tab.myapps')}>
            {!validStudent ? (
              <div className="py-16 text-center text-slate-500">{t('myapps.noId')}</div>
            ) : myHolds.length === 0 ? (
              <div className="py-16 text-center text-slate-500">{t('myapps.empty')}</div>
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
                        <div className="text-sm text-slate-500">
                          {t('myapps.holdId', { id: hold.holdId })}
                        </div>
                      </div>
                      <div className="flex items-center gap-6 text-sm">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-medium ${
                            statusTone[hold.status] ?? 'bg-slate-200 text-slate-600'
                          }`}
                        >
                          {t(`status.${hold.status}`)}
                        </span>
                        {hold.status === 'HELD' && (
                          <span className="flex items-center gap-1 font-mono text-amber-600">
                            <Clock className="h-4 w-4" />
                            {new Date(hold.expiresAt).toLocaleTimeString()}
                          </span>
                        )}
                        <span className="text-xs text-blue-700">{t('myapps.view')} →</span>
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
            aria-label={selectedClass ? selectedClass.name : t('dialog.applicationStatus')}
            className="w-full max-w-md rounded-3xl bg-white p-8"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <div className="text-2xl font-semibold">
                  {selectedClass ? selectedClass.name : t('dialog.applicationStatus')}
                </div>
                <div className="text-sm text-slate-500">
                  {selectedClass ? t('dialog.seatStatus') : selectedHold?.className}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelection(null)}
                aria-label={t('dialog.close')}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {selectedClass && (
              <>
                <div className="mb-8 grid grid-cols-2 gap-y-4 text-sm">
                  <div>{t('admin.totalSeats')}</div>
                  <div className="text-right font-mono">{selectedClass.totalSeats}</div>
                  <div>{t('classes.available')}</div>
                  <div className="text-right font-mono text-emerald-600">{selectedClass.availableSeats}</div>
                  <div>{t('classes.held')}</div>
                  <div className="text-right font-mono text-amber-600">{selectedClass.heldSeats}</div>
                  <div>{t('classes.confirmed')}</div>
                  <div className="text-right font-mono text-blue-600">{selectedClass.confirmedSeats}</div>
                </div>

                {selectedClassHold ? (
                  <button
                    type="button"
                    onClick={() => openHold(selectedClassHold)}
                    className="w-full rounded-2xl border py-3 text-blue-700 hover:bg-slate-50"
                  >
                    {t('dialog.alreadyAppliedView')}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => void applyForSeat(selectedClass)}
                    disabled={applyDisabled || selectedClass.availableSeats === 0}
                    className="w-full rounded-2xl bg-blue-800 py-3 text-white hover:bg-blue-900 disabled:bg-slate-300"
                  >
                    {selectedClass.availableSeats === 0
                      ? t('classes.classFull')
                      : t('dialog.applyForClass')}
                  </button>
                )}
              </>
            )}

            {selectedHold && (
              <>
                <div className="mb-8 space-y-4">
                  <div className="flex justify-between">
                    <span>{t('dialog.status')}</span>
                    <span className="font-mono text-lg font-semibold">
                      {t(`status.${selectedHold.status}`)}
                    </span>
                  </div>
                  {selectedHold.status === 'HELD' && holdClock && (
                    <div className="flex justify-between text-amber-600">
                      <span>{t('dialog.expiresIn')}</span>
                      <span className="font-mono text-2xl font-semibold tracking-tight">
                        {holdClock.expired ? t('dialog.expired') : holdClock.label}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between text-xs text-slate-500">
                    <span>{t('dialog.expiresAt')}</span>
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
                      <CheckCircle className="h-4 w-4" /> {t('dialog.pay')}
                    </button>
                    <button
                      type="button"
                      onClick={() => void cancelApplication(selectedHold.holdId)}
                      disabled={busy}
                      className="flex w-full items-center justify-center gap-2 rounded-2xl border py-3 text-red-600 hover:bg-red-50 disabled:text-slate-400"
                    >
                      <XCircle className="h-4 w-4" /> {t('dialog.cancel')}
                    </button>
                  </div>
                )}

                {selectedHold.status === 'CONFIRMED' && (
                  <div className="py-3 text-center text-emerald-700">
                    {t('dialog.confirmedMsg')}
                    <svg
                      viewBox="0 0 140 12"
                      className="mx-auto mt-1 block h-3 w-36 text-emerald-600"
                      fill="none"
                      aria-hidden="true"
                    >
                      <path
                        d="M2 8c15-5 31-6 47-3 10 2 21 2 33-1 12-3 27-2 56 3"
                        stroke="currentColor"
                        strokeWidth="2.2"
                        strokeLinecap="round"
                      />
                    </svg>
                  </div>
                )}
                {selectedHold.status === 'EXPIRED' && (
                  <div className="py-3 text-center text-red-600">{t('dialog.expiredMsg')}</div>
                )}
                {selectedHold.status === 'CANCELLED' && (
                  <div className="py-3 text-center text-slate-500">{t('dialog.cancelledMsg')}</div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {toasts.length > 0 && (
        <div className="pointer-events-none fixed inset-x-0 bottom-0 z-[60] flex flex-col items-center gap-2 px-4 pb-4">
          {toasts.map((toast) => (
            <ToastView key={toast.id} toast={toast} onDismiss={dismissToast} />
          ))}
        </div>
      )}
    </div>
  );
}
