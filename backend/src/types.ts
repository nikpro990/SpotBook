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

export interface Seat {
  id: number;
  seat_number: string;
  row_index: number;
  col_index: number;
  seat_type: SeatType;
}

export interface SeatWithStatus extends Seat {
  status: SeatStatus;
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


declare global {

  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export {};
