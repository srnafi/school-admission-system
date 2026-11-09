import { apiBaseUrl } from '../config';
import type { ClassDto, ConfirmDto, HoldDto, HoldSummaryDto } from './types';

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);

  if (init.body !== undefined) {
    headers.set('Content-Type', 'application/json');
  }

  let response: Response;

  try {
    response = await fetch(`${apiBaseUrl()}${path}`, { ...init, headers });
  } catch {
    throw new ApiError(0, 'NETWORK_ERROR', 'The server could not be reached.');
  }

  if (!response.ok) {
    throw await toApiError(response);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

async function toApiError(response: Response): Promise<ApiError> {
  try {
    const body = (await response.json()) as { error?: { code?: string; message?: string } };
    return new ApiError(response.status, body.error?.code ?? 'UNKNOWN_ERROR', body.error?.message ?? '');
  } catch {
    return new ApiError(response.status, 'UNKNOWN_ERROR', response.statusText);
  }
}

function studentHeaders(studentId: string): HeadersInit {
  return { 'X-Student-Id': studentId };
}

export const api = {
  listClasses: () => request<ClassDto[]>('/classes'),

  createClass: (name: string, totalSeats: number) =>
    request<ClassDto>('/classes', { method: 'POST', body: JSON.stringify({ name, totalSeats }) }),

  createHold: (classId: string, studentId: string) =>
    request<HoldDto>(`/classes/${encodeURIComponent(classId)}/holds`, {
      method: 'POST',
      headers: studentHeaders(studentId),
    }),

  getHold: (holdId: string) => request<HoldDto>(`/holds/${encodeURIComponent(holdId)}`),

  confirmHold: (holdId: string, studentId: string) =>
    request<ConfirmDto>(`/holds/${encodeURIComponent(holdId)}/confirm`, {
      method: 'POST',
      headers: studentHeaders(studentId),
    }),

  cancelHold: (holdId: string, studentId: string) =>
    request<void>(`/holds/${encodeURIComponent(holdId)}`, {
      method: 'DELETE',
      headers: studentHeaders(studentId),
    }),

  myHolds: (studentId: string) =>
    request<HoldSummaryDto[]>('/me/holds', { headers: studentHeaders(studentId) }),
};
