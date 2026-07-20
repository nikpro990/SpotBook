import type {
  AuthUser,
  Location,
  SeatWithStatus,
  CreateBookingResponse,
  BookingSummary,
  ApiErrorBody,
} from './types';

const BASE = '/api';

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

function authHeaders(): Record<string, string> {
  const token = localStorage.getItem('spotbook_token');
  return token ? { 'X-Session-Token': token } : {};
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(),
      ...(options.headers || {}),
    },
  });

  const data: unknown = await res.json().catch(() => ({}));

  if (!res.ok) {
    const message = (data as ApiErrorBody)?.error ?? `Ошибка запроса (${res.status})`;
    throw new ApiError(message, res.status);
  }

  return data as T;
}

export interface RequestOtpResponse {
  ok: true;
  message: string;
}

export interface VerifyOtpResponse {
  ok: true;
  token: string;
  user: AuthUser;
}

export interface SessionResponse {
  ok: true;
  user: AuthUser;
}

export interface CreateBookingPayload {
  location_id: number;
  date: string;
  start_hour: number;
  end_hour: number;
  seat_ids: number[];
}

export const api = {
  requestOtp: (phone: string) =>
    request<RequestOtpResponse>('/auth/request-otp', { method: 'POST', body: JSON.stringify({ phone }) }),

  verifyOtp: (phone: string, code: string) =>
    request<VerifyOtpResponse>('/auth/verify-otp', { method: 'POST', body: JSON.stringify({ phone, code }) }),

  session: () => request<SessionResponse>('/auth/session'),

  locations: () => request<Location[]>('/locations'),

  seats: (locationId: number, date: string, start: number, end: number) =>
    request<SeatWithStatus[]>(`/locations/${locationId}/seats?date=${date}&start=${start}&end=${end}`),

  createBooking: (payload: CreateBookingPayload) =>
    request<CreateBookingResponse>('/bookings', { method: 'POST', body: JSON.stringify(payload) }),

  myBookings: () => request<BookingSummary[]>('/bookings/my'),
};
