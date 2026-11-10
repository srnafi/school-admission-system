import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useLocation, useParams } from 'react-router-dom';
import { ApiError, api } from '../api/client';
import { StatusStamp } from '../components/StatusStamp';
import {
  AlertCircleIcon,
  ArrowLeftIcon,
  CheckCircleIcon,
  CheckIcon,
  ClockIcon,
  CopyIcon,
  PrinterIcon,
} from '../components/icons';
import { formatRemaining, useCountdown } from '../hooks/useCountdown';
import { errorMessage, labels, statusNotes, toBengaliDigits } from '../strings';
import { useStudentId } from '../student/StudentIdContext';
import { formatDateTime } from '../utils/datetime';

const TICK_COUNT = 10;

type Urgency = 'calm' | 'warning' | 'urgent';

export function HoldPage() {
  const { holdId = '' } = useParams();
  const location = useLocation();
  const className = (location.state as { className?: string } | null)?.className;

  const { studentId, isValid } = useStudentId();
  const queryClient = useQueryClient();

  const [cancelOpen, setCancelOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const holdQuery = useQuery({
    queryKey: ['hold', holdId],
    queryFn: () => api.getHold(holdId),
    enabled: holdId.length > 0,
    refetchInterval: 2000,
  });

  const hold = holdQuery.data;
  const remaining = useCountdown(hold?.expiresAt);

  const classesQuery = useQuery({
    queryKey: ['classes'],
    queryFn: () => api.listClasses(),
  });

  const resolvedName =
    className ?? classesQuery.data?.find((item) => item.id === hold?.classId)?.name;

  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ['hold', holdId] });
    await queryClient.invalidateQueries({ queryKey: ['classes'] });
    await queryClient.invalidateQueries({ queryKey: ['myHolds'] });
  };

  const confirm = useMutation({
    mutationFn: () => api.confirmHold(holdId, studentId),
    onSuccess: refresh,
  });

  const cancel = useMutation({
    mutationFn: () => api.cancelHold(holdId, studentId),
    onSuccess: async () => {
      setCancelOpen(false);
      await refresh();
    },
  });

  const expired = hold?.status === 'HELD' && remaining <= 0;
  const status = expired ? 'EXPIRED' : hold?.status;

  let urgency: Urgency = 'calm';
  if (remaining <= 30_000) {
    urgency = 'urgent';
  } else if (remaining <= 60_000) {
    urgency = 'warning';
  }

  const minutesLeft = Math.min(TICK_COUNT, Math.ceil(remaining / 60_000));

  const copyHoldId = () => {
    if (!hold) {
      return;
    }

    void navigator.clipboard?.writeText(hold.holdId);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  };

  const urgencyCopy = {
    calm: {
      label: 'আসন সংরক্ষিত',
      note: 'এই আসনটি সাময়িকভাবে আপনার নামে রাখা আছে। সময় শেষ হলে আসনটি আবার খালি হয়ে যাবে।',
    },
    warning: {
      label: 'সময় ফুরিয়ে আসছে',
      note: 'আর এক মিনিটেরও কম সময় বাকি। এখনই ভর্তি ফি দিন, নইলে আসনটি ছেড়ে যাবে।',
    },
    urgent: {
      label: 'শেষ সময়',
      note: 'সময় প্রায় শেষ। ফি না দিলে আসনটি স্বয়ংক্রিয়ভাবে বাতিল হয়ে যাবে।',
    },
  }[urgency];

  return (
    <div className="page">
      <div className="hold-bar">
        <Link to="/" className="link-quiet">
          <ArrowLeftIcon />
          {labels.backToClasses}
        </Link>
        {hold && (
          <button type="button" className="btn btn-quiet btn-sm" onClick={() => window.print()}>
            <PrinterIcon />
            {labels.printVoucher}
          </button>
        )}
      </div>

      {holdQuery.isLoading && (
        <section className="sheet">
          <div className="skeleton">
            {[0, 1, 2].map((row) => (
              <div key={row} className="skeleton-row">
                <span className="skeleton-bar is-name" />
                <span className="skeleton-bar is-seats" />
                <span className="skeleton-bar is-figure" />
              </div>
            ))}
          </div>
        </section>
      )}

      {holdQuery.isError && (
        <section className="sheet">
          <div className="notice is-error">
            <AlertCircleIcon className="notice-icon" />
            <span>{errorMessage((holdQuery.error as ApiError).code)}</span>
            <button type="button" className="btn btn-quiet btn-sm" onClick={() => holdQuery.refetch()}>
              {labels.retry}
            </button>
          </div>
        </section>
      )}

      {hold && (
        <div className="hold-grid">
          <section className="sheet hold-main" aria-labelledby="hold-title">
            <div className="sheet-head">
              <div className="hold-class">
                <h1 id="hold-title">{resolvedName ?? `${labels.classNameLabel} #${hold.classId}`}</h1>
                <span>সাময়িক আসন সংরক্ষণ ও ভর্তি নিশ্চিতকরণ</span>
              </div>
              <StatusStamp status={hold.status} expiresAt={hold.expiresAt} size="lg" />
            </div>

            <div className="rule-heavy" />

            {status === 'HELD' && (
              <div className={`deadline is-${urgency}`}>
                <div className="deadline-head">
                  <span className="deadline-label">
                    <ClockIcon />
                    {labels.timeLeft}
                  </span>
                  <span className="deadline-state">{urgencyCopy.label}</span>
                </div>

                <div className="deadline-digits">{formatRemaining(remaining)}</div>

                <div className="deadline-ticks" aria-hidden="true">
                  {Array.from({ length: TICK_COUNT }, (_, index) => (
                    <i key={index} className={index < minutesLeft ? 'is-full' : undefined} />
                  ))}
                </div>

                <div className="deadline-scale" aria-hidden="true">
                  <span>{toBengaliDigits(TICK_COUNT)} মিনিট</span>
                  <span>০</span>
                </div>

                <p className="deadline-note">{urgencyCopy.note}</p>
              </div>
            )}

            {status === 'CONFIRMED' && (
              <div className="outcome is-confirmed">
                <CheckCircleIcon className="outcome-icon" />
                <div>
                  <strong>আপনার ভর্তি নিশ্চিত হয়েছে</strong>
                  <p>ডানের ভাউচারটি সংরক্ষণ বা প্রিন্ট করে রাখুন। শ্রেণিতে যোগ দেওয়ার সময় এটি দেখাতে হবে।</p>
                </div>
              </div>
            )}

            {status === 'EXPIRED' && (
              <div className="outcome is-expired">
                <AlertCircleIcon className="outcome-icon" />
                <div>
                  <strong>আসনটি ছেড়ে দেওয়া হয়েছে</strong>
                  <p>নির্ধারিত সময়ে ফি দেওয়া হয়নি। ক্লাস তালিকা থেকে আবার আবেদন করা যাবে, যদি আসন খালি থাকে।</p>
                </div>
              </div>
            )}

            {status === 'CANCELLED' && (
              <div className="outcome is-cancelled">
                <AlertCircleIcon className="outcome-icon" />
                <div>
                  <strong>আবেদনটি বাতিল করা হয়েছে</strong>
                  <p>আপনি এই আসনটির দাবি প্রত্যাহার করেছেন। আসনটি আবার সাধারণ তালিকায় খালি দেখাচ্ছে।</p>
                </div>
              </div>
            )}

            <div className="hold-actions">
              {cancelOpen ? (
                <div className="cancel-confirm">
                  <p>
                    <AlertCircleIcon />
                    আপনি কি এই সংরক্ষিত আসনটি ছেড়ে দিতে চান? এটি আর ফেরত পাওয়া যাবে না।
                  </p>
                  <div className="cancel-actions">
                    <button
                      type="button"
                      className="btn btn-sm btn-danger-solid"
                      disabled={cancel.isPending}
                      onClick={() => cancel.mutate()}
                    >
                      {cancel.isPending ? 'বাতিল হচ্ছে…' : 'হ্যাঁ, বাতিল করুন'}
                    </button>
                    <button
                      type="button"
                      className="btn btn-quiet btn-sm"
                      disabled={cancel.isPending}
                      onClick={() => setCancelOpen(false)}
                    >
                      না, ফিরে যান
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  {status !== 'CONFIRMED' && status !== 'CANCELLED' && (
                    <button
                      type="button"
                      className={`btn ${status === 'HELD' ? 'btn-primary' : 'btn-quiet'}`}
                      disabled={!isValid || status !== 'HELD'}
                      onClick={() => confirm.mutate()}
                    >
                      {confirm.isPending ? (
                        <>
                          <span className="btn-spinner" />
                          {labels.applying}
                        </>
                      ) : (
                        labels.pay
                      )}
                    </button>
                  )}

                  {status === 'HELD' && (
                    <button
                      type="button"
                      className="btn btn-danger"
                      disabled={!isValid}
                      onClick={() => setCancelOpen(true)}
                    >
                      {labels.cancel}
                    </button>
                  )}

                  {status === 'EXPIRED' && (
                    <Link to="/" className="btn btn-quiet">
                      আবার আবেদন করুন
                    </Link>
                  )}

                  {(status === 'CONFIRMED' || status === 'CANCELLED') && (
                    <Link to="/" className="btn btn-primary">
                      {labels.backToClasses}
                    </Link>
                  )}

                  <p className="hold-actions-note">
                    {status === 'HELD'
                      ? isValid
                        ? 'ফি দিলে আসনটি নিশ্চিত হবে। বাতিল করলে আসনটি আবার খালি হবে।'
                        : 'ফি দিতে উপরে জন্ম নিবন্ধন নম্বরটি দিন।'
                      : null}
                  </p>
                </>
              )}
            </div>

            {confirm.isError && (
              <div className="notice is-error">
                <AlertCircleIcon className="notice-icon" />
                <span>{errorMessage((confirm.error as ApiError).code)}</span>
              </div>
            )}

            {cancel.isError && (
              <div className="notice is-error">
                <AlertCircleIcon className="notice-icon" />
                <span>{errorMessage((cancel.error as ApiError).code)}</span>
              </div>
            )}
          </section>

          <aside className="sheet voucher" aria-labelledby="voucher-title">
            <div className="voucher-head">
              <div>
                <p className="voucher-kicker">অফিসিয়াল কপি</p>
                <h2 className="voucher-title" id="voucher-title">
                  সাময়িক ভর্তি ভাউচার
                </h2>
              </div>
            </div>

            <div className="voucher-serial">
              <span>{labels.holdId}</span>
              <b>#{hold.holdId}</b>
              <button
                type="button"
                className="icon-btn"
                onClick={copyHoldId}
                title="আবেদন নম্বর কপি করুন"
                aria-label="আবেদন নম্বর কপি করুন"
              >
                {copied ? <CheckIcon /> : <CopyIcon />}
              </button>
            </div>

            <dl className="voucher-rows">
              <div className="voucher-row">
                <dt>{labels.classNameLabel}</dt>
                <dd>{resolvedName ?? hold.classId}</dd>
              </div>
              <div className="voucher-row">
                <dt>শিক্ষার্থীর জন্ম নিবন্ধন</dt>
                <dd className="mono">{hold.studentId}</dd>
              </div>
              <div className="voucher-row">
                <dt>{labels.expiresAt}</dt>
                <dd>{formatDateTime(hold.expiresAt)}</dd>
              </div>
              <div className="voucher-row">
                <dt>{labels.status}</dt>
                <dd>{statusNotes[status ?? 'HELD']}</dd>
              </div>
            </dl>

            <p className="voucher-foot">
              ভর্তি ফি দেওয়ার পর এই ভাউচারটি সাময়িক ভর্তির প্রমাণ। শ্রেণিতে ভর্তি সম্পন্ন করতে প্রতিষ্ঠানের
              অফিসে মূল কপি দেখান।
            </p>
          </aside>
        </div>
      )}
    </div>
  );
}
