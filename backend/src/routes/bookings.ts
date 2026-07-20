import { Router } from 'express';
import { z } from 'zod';
import { pool } from '../db';
import { requireAuth } from '../services/authMiddleware';
import { sendSms } from '../services/sms';
import { BookingSummary } from '../types';

export const bookingsRouter = Router();

const MAX_SEATS_PER_BOOKING = 20;
const MAX_DURATION_HOURS = 12;

const createBookingSchema = z.object({
  location_id: z.number().int().positive(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Дата должна быть в формате ГГГГ-ММ-ДД'),
  start_hour: z.number().int().min(0).max(23),
  end_hour: z.number().int().min(1).max(24),
  seat_ids: z.array(z.number().int().positive()).min(1).max(MAX_SEATS_PER_BOOKING),
});

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

const PG_UNIQUE_VIOLATION = '23505';

function isPgError(err: unknown): err is { code: string } {
  return typeof err === 'object' && err !== null && 'code' in err;
}

bookingsRouter.post('/', requireAuth, async (req, res) => {
  const parsed = createBookingSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.errors[0]?.message ?? 'Некорректные данные' });
    return;
  }
  const { location_id, date, start_hour, end_hour, seat_ids } = parsed.data;

  if (start_hour >= end_hour) {
    res.status(400).json({ error: 'Время окончания должно быть позже времени начала' });
    return;
  }
  if (end_hour - start_hour > MAX_DURATION_HOURS) {
    res.status(400).json({ error: `Максимальная длительность одной брони — ${MAX_DURATION_HOURS} часов` });
    return;
  }
  if (date < todayISO()) {
    res.status(400).json({ error: 'Нельзя бронировать на прошедшую дату' });
    return;
  }
 
  const uniqueSeatIds = [...new Set(seat_ids)];

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { rows: locRows } = await client.query<{ price_per_hour_byn: string; name: string }>(
      'SELECT price_per_hour_byn, name FROM locations WHERE id = $1',
      [location_id]
    );
    const location = locRows[0];
    if (!location) {
      await client.query('ROLLBACK');
      res.status(404).json({ error: 'Локация не найдена' });
      return;
    }

    const { rows: seatRows } = await client.query<{ id: number }>(
      'SELECT id FROM seats WHERE id = ANY($1::int[]) AND location_id = $2',
      [uniqueSeatIds, location_id]
    );
    if (seatRows.length !== uniqueSeatIds.length) {
      await client.query('ROLLBACK');
      res.status(400).json({ error: 'Одно или несколько мест не принадлежат выбранной локации' });
      return;
    }

    const hours = end_hour - start_hour;
    const totalPrice = Number(location.price_per_hour_byn) * hours * uniqueSeatIds.length;

    const { rows: bookingRows } = await client.query<{ id: number }>(
      `INSERT INTO bookings (user_id, location_id, booking_date, start_hour, end_hour, total_price_byn)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
      [req.user!.id, location_id, date, start_hour, end_hour, totalPrice]
    );
    const bookingId = bookingRows[0]!.id;

    for (const seatId of uniqueSeatIds) {
      await client.query('INSERT INTO booking_seats (booking_id, seat_id) VALUES ($1, $2)', [bookingId, seatId]);
      for (let h = start_hour; h < end_hour; h++) {

        await client.query(
          'INSERT INTO booking_slots (seat_id, slot_date, slot_hour, booking_id) VALUES ($1, $2, $3, $4)',
          [seatId, date, h, bookingId]
        );
      }
    }

    await client.query('COMMIT');

    const { rows: seatNumbers } = await pool.query<{ seat_number: string }>(
      'SELECT seat_number FROM seats WHERE id = ANY($1::int[]) ORDER BY seat_number',
      [uniqueSeatIds]
    );
    const seatList = seatNumbers.map((s) => s.seat_number).join(', ');
    const message = `SpotBook: бронь подтверждена. ${location.name}, места ${seatList}, ${date} с ${start_hour}:00 до ${end_hour}:00. К оплате ${totalPrice.toFixed(2)} BYN.`;
    await sendSms(req.user!.phone, message);

    res.status(201).json({
      ok: true,
      booking_id: bookingId,
      total_price_byn: totalPrice,
      seats: seatNumbers.map((s) => s.seat_number),
    });
  } catch (err) {
    await client.query('ROLLBACK');
    if (isPgError(err) && err.code === PG_UNIQUE_VIOLATION) {
      res.status(409).json({
        error: 'Одно из выбранных мест уже забронировано на это время. Пожалуйста, выберите другое место.',
      });
      return;
    }
    console.error('[bookings:ERROR]', err);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  } finally {
    client.release();
  }
});

bookingsRouter.get('/my', requireAuth, async (req, res) => {
  const { rows } = await pool.query<BookingSummary>(
    `SELECT b.id, b.booking_date, b.start_hour, b.end_hour, b.total_price_byn, b.status,
            l.name AS location_name,
            array_agg(s.seat_number ORDER BY s.seat_number) AS seats
     FROM bookings b
     JOIN locations l ON l.id = b.location_id
     JOIN booking_seats bs ON bs.booking_id = b.id
     JOIN seats s ON s.id = bs.seat_id
     WHERE b.user_id = $1
     GROUP BY b.id, l.name
     ORDER BY b.booking_date DESC, b.start_hour DESC`,
    [req.user!.id]
  );
  res.json(rows);
});
