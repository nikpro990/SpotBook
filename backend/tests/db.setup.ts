import { pool } from '../src/db';

beforeEach(async () => {
  await pool.query(
    'TRUNCATE TABLE booking_slots, booking_seats, bookings, seats, locations, users, sms_log RESTART IDENTITY CASCADE'
  );
});

afterAll(async () => {
  await pool.end();
});
