import type { ClassInfo, Hold, MyHold } from './types';
import { apiBaseUrl } from './config';

const BASE = apiBaseUrl();

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

const defaultMessages: Record<number, string> = {
  400: 'ইনপুট সঠিক নয়। অনুগ্রহ করে তথ্য যাচাই করে আবার চেষ্টা করুন।',
  401: 'শিক্ষার্থীর জন্ম নিবন্ধন নম্বর প্রয়োজন।',
  403: 'এই কাজটি করার অনুমতি আপনার নেই।',
  404: 'তথ্যটি খুঁজে পাওয়া যায়নি।',
  409: 'অনুরোধটি সম্পন্ন করা যায়নি (সিট শেষ, মেয়াদ উত্তীর্ণ, অথবা আগেই আবেদন করা আছে)।',
  422: 'ইনপুট সঠিক নয়।',
  500: 'সার্ভারে সমস্যা হয়েছে। কিছুক্ষণ পর আবার চেষ্টা করুন।',
};

async function request<T>(
  path: string,
  opts: { method?: string; body?: unknown; studentId?: string } = {}
): Promise<T> {
  const headers: Record<string, string> = {};
  if (opts.body !== undefined) headers['Content-Type'] = 'application/json';
  if (opts.studentId) headers['X-Student-Id'] = opts.studentId;

  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, {
      method: opts.method ?? 'GET',
      headers,
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
    });
  } catch {
    throw new ApiError(
      0,
      'সার্ভারের সাথে যোগাযোগ করা যাচ্ছে না। ইন্টারনেট বা সার্ভার চালু আছে কিনা দেখুন।'
    );
  }

  if (res.status === 204) return undefined as T;

  let data: any = null;
  try {
    data = await res.json();
  } catch {
    /* empty body */
  }

  if (!res.ok) {
    const base = defaultMessages[res.status] ?? 'একটি অপ্রত্যাশিত সমস্যা হয়েছে।';
    const detail = data?.message || data?.detail || data?.error || data?.title;
    throw new ApiError(res.status, detail ? `${base} (${detail})` : base);
  }
  return data as T;
}

export const api = {
  createClass: (name: string, totalSeats: number) =>
    request<{ id: string; name: string; totalSeats: number }>('/classes', {
      method: 'POST',
      body: { name, totalSeats },
    }),
  listClasses: () => request<ClassInfo[]>('/classes'),
  getClass: (id: string) => request<ClassInfo>(`/classes/${id}`),
  apply: (classId: string, studentId: string) =>
    request<Hold>(`/classes/${classId}/holds`, { method: 'POST', studentId }),
  getHold: (id: string) => request<Hold>(`/holds/${id}`),
  confirm: (id: string, studentId: string) =>
    request<{ holdId: string; status: string }>(`/holds/${id}/confirm`, { method: 'POST', studentId }),
  cancel: (id: string, studentId: string) =>
    request<void>(`/holds/${id}`, { method: 'DELETE', studentId }),
  myHolds: (studentId: string) => request<MyHold[]>('/me/holds', { studentId }),
};
