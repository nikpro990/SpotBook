export interface AuthUser {
  id: number;
  phone: string;
  name: string | null;
}

export interface Location {
  id: number;
  name: string;
  description: string | null;
  price_per_hour_byn: string;
  rows: number;
  cols: number;
}

export type SeatType = 'standard' | 'vip' | 'disabled';
export type SeatStatus = 'free' | 'occupied';

export interface SeatWithStatus {
  id: number;
  seat_number: string;
  row_index: number;
  col_index: number;
  seat_type: SeatType;
  status: SeatStatus;
}

export interface CreateBookingResponse {
  ok: true;
  booking_id: number;
  total_price_byn: number;
  seats: string[];
}

export interface BookingSummary {
  id: number;
  booking_date: string;
  start_hour: number;
  end_hour: number;
  total_price_byn: string;
  status: 'confirmed' | 'cancelled';
  location_name: string;
  seats: string[];
}

export interface BookingDraft {
  date: string;
  startHour: number;
  endHour: number;
  selected: SeatWithStatus[];
  totalPrice: number;
}

export interface ApiErrorBody {
  error?: string;
}
