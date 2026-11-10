import { useState, useMemo } from 'react';
import { Alert, Button, TextInput, Modal } from '@mantine/core';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { ApiError, api } from '../api/client';
import type { ClassDto } from '../api/types';
import { labels, errorMessage } from '../strings';
import { useStudentId } from '../student/StudentIdContext';
import {
  AlertCircleIcon,
  ShieldCheckIcon,
  SearchIcon,
  PlusIcon,
  CopyIcon,
  CheckIcon,
} from '../components/icons';

export function ClassesPage() {
  const { studentId, isValid } = useStudentId();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [name, setName] = useState('');
  const [seats, setSeats] = useState('');
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterOnlyAvailable, setFilterOnlyAvailable] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

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
      setCreateModalOpen(false);
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
  const canCreate =
    name.trim().length > 0 && Number.isInteger(seatCount) && seatCount > 0 && !createClass.isPending;

  const classes = classesQuery.data ?? [];
  const totalCapacity = classes.reduce((total, item) => total + item.totalSeats, 0);
  const freeSeats = classes.reduce((total, item) => total + item.availableSeats, 0);

  const filteredClasses = useMemo(() => {
    return classes.filter((item) => {
      const matchesSearch =
        searchQuery.trim().length === 0 ||
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.id.toLowerCase().includes(searchQuery.toLowerCase());

      if (!matchesSearch) return false;
      if (filterOnlyAvailable) return item.availableSeats > 0;
      return true;
    });
  }, [classes, searchQuery, filterOnlyAvailable]);

  const focusStudentIdInput = () => {
    const el = document.getElementById('student-id-input');
    if (el) {
      el.focus();
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  const copyId = (id: string) => {
    navigator.clipboard.writeText(id);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1800);
  };

  const quickPresets = [
    'Class 6 - Morning Shift',
    'Class 6 - Day Shift',
    'Class 7 - Morning Shift',
    'Class 8 - Morning Shift',
    'Class 9 - Science',
    'Class 10 - Science',
  ];

  return (
    <div className="desk-container">
      {/* 1. Header with Clean Metadata & Action */}
      <div className="desk-header">
        <div className="desk-header-info">
          <div className="desk-title-row">
            <h1 className="desk-title">{labels.navClasses}</h1>
            <span className="desk-meta-badge num">
              {classes.length}টি শ্রেণি · {totalCapacity} মোট আসন · {freeSeats}টি খালি
            </span>
          </div>
          <p className="desk-subtitle">
            শ্রেণিভিত্তিক আসন বিন্যাস ও সরাসরি আবেদন গ্রহণ ডেস্ক
          </p>
        </div>

        <div className="desk-header-actions">
          <Button
            leftSection={<PlusIcon />}
            size="sm"
            color="blue"
            onClick={() => setCreateModalOpen(true)}
            className="btn-create-action"
          >
            {labels.createClassTitle}
          </Button>
        </div>
      </div>

      {/* 2. Uncluttered Controls Toolbar */}
      <div className="desk-toolbar">
        <div className="toolbar-search-box">
          <TextInput
            placeholder="ক্লাসের নাম দিয়ে খুঁজুন..."
            leftSection={<SearchIcon />}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.currentTarget.value)}
            size="sm"
            className="clean-search-field"
          />
        </div>

        <div className="toolbar-toggle-group">
          <button
            type="button"
            className={`desk-toggle-pill${!filterOnlyAvailable ? ' is-active' : ''}`}
            onClick={() => setFilterOnlyAvailable(false)}
          >
            সকল ক্লাস ({classes.length})
          </button>
          <button
            type="button"
            className={`desk-toggle-pill${filterOnlyAvailable ? ' is-active' : ''}`}
            onClick={() => setFilterOnlyAvailable(true)}
          >
            শুধুমাত্র খালি আসন ({classes.filter((c) => c.availableSeats > 0).length})
          </button>
        </div>

        {classesQuery.isFetching && (
          <div className="desk-live-tag" title="ডেটাবেস থেকে লাইভ আসন যাচাই হচ্ছে">
            <span className="pulse-dot" /> লাইভ
          </div>
        )}
      </div>

      {/* 3. Quiet Notice when Student ID is missing */}
      {!isValid && (
        <div className="desk-notice-banner">
          <div className="notice-banner-left">
            <ShieldCheckIcon className="notice-banner-icon" />
            <div className="notice-banner-text">
              <strong>{labels.needStudentId}</strong>
              <span>আসন দাবি করার জন্য উপরে শিক্ষার্থীর ১৭ অঙ্কের জন্ম নিবন্ধন নম্বর দিন</span>
            </div>
          </div>
          <Button size="xs" variant="white" color="blue" onClick={focusStudentIdInput}>
            নম্বর লিখুন
          </Button>
        </div>
      )}

      {/* 4. Error Alerts */}
      {classesQuery.isError && (
        <Alert color="red" variant="light" icon={<AlertCircleIcon />}>
          {errorMessage((classesQuery.error as ApiError).code)}
        </Alert>
      )}

      {apply.isError && (
        <Alert color="red" variant="light" icon={<AlertCircleIcon />}>
          {errorMessage((apply.error as ApiError).code)}
        </Alert>
      )}

      {/* 5. Clean, Professional Table */}
      <div className="panel desk-table-panel">
        {classesQuery.isLoading && (
          <div className="empty-loading-state">
            <div className="custom-loader-ring" />
            <p>{labels.loading}</p>
          </div>
        )}

        {!classesQuery.isLoading && classes.length === 0 && (
          <div className="empty-classes-state">
            <h3>{labels.noClasses}</h3>
            <p>ভর্তি কার্যক্রম শুরু করতে উপরের বোতামটি চেপে প্রথম ক্লাসটি সংযোজন করুন।</p>
            <Button
              size="sm"
              color="blue"
              onClick={() => setCreateModalOpen(true)}
              style={{ marginTop: '0.75rem' }}
            >
              + {labels.createClassTitle}
            </Button>
          </div>
        )}

        {filteredClasses.length > 0 && (
          <div className="table-responsive">
            <table className="grid-table clean-desk-table">
              <thead>
                <tr>
                  <th className="col-class-name">{labels.classNameLabel}</th>
                  <th className="cell-num col-optional">{labels.seatsTotal}</th>
                  <th className="cell-num col-optional">{labels.seatsHeld}</th>
                  <th className="cell-num">{labels.seatsConfirmed}</th>
                  <th className="cell-num col-available">{labels.seatsAvailable}</th>
                  <th className="cell-action">পদক্ষেপ</th>
                </tr>
              </thead>
              <tbody>
                {filteredClasses.map((item) => {
                  const applying = apply.isPending && apply.variables?.id === item.id;
                  const total = Math.max(item.totalSeats, 1);
                  const isFull = item.availableSeats <= 0;
                  const occupiedPercent = Math.min(100, Math.round(((total - item.availableSeats) / total) * 100));

                  return (
                    <tr key={item.id} className={isFull ? 'row-full' : ''}>
                      {/* Class Name & Code */}
                      <td>
                        <div className="clean-class-identity">
                          <strong className="clean-class-title">{item.name}</strong>
                          <div className="clean-class-code">
                            <span className="code-text num">#{item.id}</span>
                            <button
                              type="button"
                              className="code-copy-btn"
                              onClick={() => copyId(item.id)}
                              title="কোড কপি করুন"
                            >
                              {copiedId === item.id ? <CheckIcon /> : <CopyIcon />}
                            </button>
                          </div>
                        </div>
                      </td>

                      {/* Total */}
                      <td className="cell-num col-optional num">
                        <span className="clean-metric-num">{item.totalSeats}</span>
                      </td>

                      {/* Held */}
                      <td className="cell-num col-optional num">
                        {item.heldSeats > 0 ? (
                          <span className="held-text num" title="১০ মিনিটের হোল্ডে আছে">
                            {item.heldSeats}
                          </span>
                        ) : (
                          <span className="text-muted">—</span>
                        )}
                      </td>

                      {/* Confirmed */}
                      <td className="cell-num num">
                        {item.confirmedSeats > 0 ? (
                          <span className="confirmed-text num" title="ভর্তি নিশ্চিত সম্পন্ন">
                            {item.confirmedSeats}
                          </span>
                        ) : (
                          <span className="text-muted">—</span>
                        )}
                      </td>

                      {/* Available with clean single progress bar */}
                      <td className="cell-num">
                        <div className="clean-capacity-row">
                          <span
                            className={`clean-available-val num ${isFull ? 'is-zero' : 'is-positive'}`}
                          >
                            {item.availableSeats}
                          </span>
                          <div
                            className="clean-capacity-track"
                            title={`${occupiedPercent}% আসন পূর্ণ`}
                          >
                            <span
                              className={`clean-capacity-fill${isFull ? ' is-full' : ''}`}
                              style={{ width: `${occupiedPercent}%` }}
                            />
                          </div>
                        </div>
                      </td>

                      {/* Action */}
                      <td className="cell-action">
                        <Button
                          size="xs"
                          variant={isFull ? 'default' : 'filled'}
                          color={isFull ? 'gray' : 'blue'}
                          disabled={!isValid || isFull || apply.isPending}
                          loading={applying}
                          onClick={() => apply.mutate(item)}
                          className={isFull ? 'btn-disabled-desk' : 'btn-apply-desk'}
                        >
                          {isFull ? labels.full : labels.apply}
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {!classesQuery.isLoading && classes.length > 0 && filteredClasses.length === 0 && (
          <div className="empty-search-state">
            <p>"{searchQuery}" এর সাথে মিলে এমন কোনো শ্রেণি পাওয়া যায়নি।</p>
            <Button size="xs" variant="subtle" onClick={() => setSearchQuery('')}>
              ফিল্টার মুছুন
            </Button>
          </div>
        )}
      </div>

      {/* 6. Clean Modal for Class Creation */}
      <Modal
        opened={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title={
          <div className="modal-head">
            <strong>{labels.createClassTitle}</strong>
            <span>নতুন শ্রেণির আসন ও বিবরণ নির্ধারণ করুন</span>
          </div>
        }
        size="md"
        centered
        radius="md"
      >
        <form
          className="clean-modal-form"
          onSubmit={(event) => {
            event.preventDefault();
            if (canCreate) {
              createClass.mutate();
            }
          }}
        >
          <div className="presets-row">
            <span className="presets-title">প্রিসেট:</span>
            <div className="presets-chips">
              {quickPresets.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  className="preset-pill"
                  onClick={() => setName(preset)}
                >
                  {preset}
                </button>
              ))}
            </div>
          </div>

          <TextInput
            label={labels.className}
            placeholder={labels.classNamePlaceholder}
            value={name}
            required
            autoFocus
            size="sm"
            onChange={(event) => setName(event.currentTarget.value)}
          />

          <TextInput
            label={labels.totalSeats}
            value={seats}
            inputMode="numeric"
            placeholder="৫০"
            required
            size="sm"
            onChange={(event) => setSeats(event.currentTarget.value.replace(/\D/g, ''))}
          />

          {createClass.isError && (
            <Alert color="red" variant="light" icon={<AlertCircleIcon />}>
              {errorMessage((createClass.error as ApiError).code)}
            </Alert>
          )}

          <div className="modal-actions">
            <Button variant="default" size="sm" onClick={() => setCreateModalOpen(false)}>
              বাতিল
            </Button>
            <Button
              type="submit"
              size="sm"
              color="blue"
              disabled={!canCreate}
              loading={createClass.isPending}
            >
              {labels.createClass}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
