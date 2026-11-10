import { useState } from 'react';
import { Alert, Anchor, Button, Group } from '@mantine/core';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useLocation, useParams } from 'react-router-dom';
import { ApiError, api } from '../api/client';
import { StatusBadge } from '../components/StatusBadge';
import { formatRemaining, useCountdown } from '../hooks/useCountdown';
import { labels, errorMessage } from '../strings';
import { useStudentId } from '../student/StudentIdContext';
import {
  ArrowLeftIcon,
  ClockIcon,
  CheckCircleIcon,
  AlertCircleIcon,
  PrinterIcon,
  CopyIcon,
  CheckIcon,
} from '../components/icons';

export function HoldPage() {
  const { holdId = '' } = useParams();
  const location = useLocation();
  const className = (location.state as { className?: string } | null)?.className;

  const { studentId, isValid } = useStudentId();
  const queryClient = useQueryClient();

  const [confirmCancelOpen, setConfirmCancelOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const holdQuery = useQuery({
    queryKey: ['hold', holdId],
    queryFn: () => api.getHold(holdId),
    enabled: holdId.length > 0,
    refetchInterval: 2000,
  });

  const hold = holdQuery.data;
  const remaining = useCountdown(hold?.expiresAt);

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
      setConfirmCancelOpen(false);
      await refresh();
    },
  });

  const expired = hold?.status === 'HELD' && remaining <= 0;
  const status = expired ? 'EXPIRED' : hold?.status;

  const copyHoldId = () => {
    if (hold?.holdId) {
      navigator.clipboard.writeText(hold.holdId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  let urgencyLevel: 'calm' | 'warning' | 'urgent' | 'expired' = 'calm';
  if (status === 'EXPIRED') {
    urgencyLevel = 'expired';
  } else if (remaining <= 30_000) {
    urgencyLevel = 'urgent';
  } else if (remaining <= 60_000) {
    urgencyLevel = 'warning';
  }

  return (
    <div className="desk-container hold-desk-container">
      {/* Back navigation bar */}
      <div className="hold-nav-bar">
        <Anchor component={Link} to="/" className="clean-back-link">
          <ArrowLeftIcon />
          <span>{labels.backToClasses}</span>
        </Anchor>
        {hold && (
          <button
            type="button"
            className="clean-print-btn"
            onClick={() => window.print()}
            title="ভাউচার প্রিন্ট করুন"
          >
            <PrinterIcon /> প্রিন্ট কপি
          </button>
        )}
      </div>

      {holdQuery.isLoading && (
        <div className="empty-loading-state">
          <div className="custom-loader-ring" />
          <p>{labels.loading}</p>
        </div>
      )}

      {holdQuery.isError && (
        <Alert color="red" variant="light" icon={<AlertCircleIcon />}>
          {errorMessage((holdQuery.error as ApiError).code)}
        </Alert>
      )}

      {hold && (
        <div className="hold-split-grid">
          {/* Main Action Terminal Panel */}
          <div className="panel hold-action-panel">
            <div className="panel-head">
              <div>
                <h1 className="desk-title">
                  {className ?? `${labels.classNameLabel} #${hold.classId}`}
                </h1>
                <span className="desk-subtitle">সাময়িক আসন সংরক্ষণ ও ভর্তি নিশ্চিতকরণ</span>
              </div>
              <StatusBadge status={hold.status} expiresAt={hold.expiresAt} />
            </div>

            <div className="hold-action-body">
              {/* Clean Countdown Card */}
              {status === 'HELD' && (
                <div className={`clean-timer-box urgency-${urgencyLevel}`}>
                  <div className="timer-label-row">
                    <span className="timer-field-label">
                      <ClockIcon /> {labels.timeLeft}
                    </span>
                    <span className="timer-state-text">
                      {urgencyLevel === 'urgent'
                        ? 'জরুরি সময়'
                        : urgencyLevel === 'warning'
                          ? 'সময়সীমা ঘনিয়ে আসছে'
                          : 'আসন সংরক্ষিত'}
                    </span>
                  </div>

                  <div className="timer-digits num">{formatRemaining(remaining)}</div>

                  <p className="timer-note">
                    {urgencyLevel === 'urgent'
                      ? 'সময় প্রায় শেষ! আসনটি স্বয়ংক্রিয়ভাবে বাতিল হওয়ার আগেই ভর্তি ফি পরিশোধ করুন।'
                      : 'নির্ধারিত সময়ের মধ্যে ভর্তি ফি নিশ্চিত করে আসনটি চূড়ান্ত করুন।'}
                  </p>
                </div>
              )}

              {/* Status Outcome Banners */}
              {status === 'CONFIRMED' && (
                <div className="outcome-banner banner-confirmed">
                  <CheckCircleIcon className="outcome-icon" />
                  <div className="outcome-text">
                    <strong>আপনার ভর্তি নিশ্চিত হয়েছে</strong>
                    <span>অনলাইন সাময়িক ভর্তি সফলভাবে সম্পন্ন হয়েছে। ডানের ভাউচারটি সংরক্ষণ করুন।</span>
                  </div>
                </div>
              )}

              {status === 'EXPIRED' && (
                <div className="outcome-banner banner-expired">
                  <AlertCircleIcon className="outcome-icon" />
                  <div className="outcome-text">
                    <strong>আসনটি ছেড়ে দেওয়া হয়েছে</strong>
                    <span>নির্ধারিত সময়ে ফি প্রদান না করায় আবেদনটির মেয়াদ শেষ হয়েছে। পুনরায় আবেদন করতে ক্লাস তালিকায় ফিরে যান।</span>
                  </div>
                </div>
              )}

              {status === 'CANCELLED' && (
                <div className="outcome-banner banner-cancelled">
                  <AlertCircleIcon className="outcome-icon" />
                  <div className="outcome-text">
                    <strong>আবেদনটি বাতিল করা হয়েছে</strong>
                    <span>আপনি এই আসনটির দাবি প্রত্যাহার করেছেন। এটি পুনরায় সাধারণ তালিকায় উন্মুক্ত করা হয়েছে।</span>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="hold-buttons-block">
                {!confirmCancelOpen ? (
                  <Group gap="sm">
                    <Button
                      size="md"
                      color="blue"
                      disabled={!isValid || status !== 'HELD'}
                      loading={confirm.isPending}
                      onClick={() => confirm.mutate()}
                      className="btn-pay-desk"
                    >
                      {labels.pay}
                    </Button>

                    {status === 'HELD' && (
                      <Button
                        size="md"
                        variant="subtle"
                        color="red"
                        disabled={!isValid || status !== 'HELD'}
                        onClick={() => setConfirmCancelOpen(true)}
                        className="btn-cancel-desk"
                      >
                        {labels.cancel}
                      </Button>
                    )}
                  </Group>
                ) : (
                  <div className="cancel-confirm-box">
                    <div className="cancel-confirm-text">
                      <AlertCircleIcon />
                      <span>আপনি কি নিশ্চিতভাবে এই সংরক্ষিত আসনটি ছেড়ে দিতে চান?</span>
                    </div>
                    <Group gap="xs" style={{ marginTop: '0.4rem' }}>
                      <Button
                        size="xs"
                        color="red"
                        variant="filled"
                        loading={cancel.isPending}
                        onClick={() => cancel.mutate()}
                      >
                        হ্যাঁ, বাতিল নিশ্চিত করুন
                      </Button>
                      <Button
                        size="xs"
                        variant="default"
                        disabled={cancel.isPending}
                        onClick={() => setConfirmCancelOpen(false)}
                      >
                        না, ফিরে যান
                      </Button>
                    </Group>
                  </div>
                )}
              </div>

              {confirm.isError && (
                <Alert color="red" variant="light" icon={<AlertCircleIcon />}>
                  {errorMessage((confirm.error as ApiError).code)}
                </Alert>
              )}

              {cancel.isError && (
                <Alert color="red" variant="light" icon={<AlertCircleIcon />}>
                  {errorMessage((cancel.error as ApiError).code)}
                </Alert>
              )}
            </div>
          </div>

          {/* Official Voucher / Receipt Panel */}
          <div className="panel voucher-panel" id="admission-voucher">
            <div className="panel-head">
              <h2 className="desk-title">{labels.details}</h2>
              <span className="voucher-seal">অফিসিয়াল কপি</span>
            </div>

            <ul className="clean-receipt-list">
              <li>
                <span className="receipt-label">{labels.holdId}</span>
                <div className="receipt-val-group">
                  <b className="num">#{hold.holdId}</b>
                  <button
                    type="button"
                    className="receipt-copy-btn"
                    onClick={copyHoldId}
                    title="কপি করুন"
                  >
                    {copied ? <CheckIcon /> : <CopyIcon />}
                  </button>
                </div>
              </li>
              <li>
                <span className="receipt-label">{labels.classNameLabel}</span>
                <b>{className ?? hold.classId}</b>
              </li>
              <li>
                <span className="receipt-label">শিক্ষার্থীর জন্ম নিবন্ধন</span>
                <b className="num">{hold.studentId}</b>
              </li>
              <li>
                <span className="receipt-label">{labels.expiresAt}</span>
                <b className="num">
                  {new Date(hold.expiresAt).toLocaleString('bn-BD', {
                    dateStyle: 'medium',
                    timeStyle: 'medium',
                  })}
                </b>
              </li>
            </ul>

            <div className="voucher-note">
              <span>বাংলাদেশ শিক্ষা বোর্ড ডিজিটাল ডাটাবেজ দ্বারা সংরক্ষিত।</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
