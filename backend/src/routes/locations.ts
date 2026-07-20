import { Router } from 'express';
import { z } from 'zod';
import { pool } from '../db';
import { Location, Seat, SeatWithStatus } from '../types';

export const locationsRouter = Router();


locationsRouter.get('/', async (_req, res) => {
  const { rows } = await pool.query<Location>(
    'SELECT id, name, description, price_per_hour_byn, rows, cols FROM locations ORDER BY id'
  );
  res.json(rows);
});

const seatsQuerySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Некорректная дата'),
  start: z.coerce.number().int().min(0).max(23),
  end: z.coerce.number().int().min(1).max(24),
});


locationsRouter.get('/:id/seats', async (req, res) => {
  const idParsed = z.coerce.number().int().positive().safeParse(req.params.id);
  if (!idParsed.success) {
    res.status(400).json({ error: 'Некорректный id локации' });
    return;
  }
  const id = idParsed.data;

  const parsed = seatsQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.errors[0]?.message ?? 'Некорректные параметры' });
    return;
  }
  const { date, start: startHour, end: endHour } = parsed.data;
  if (startHour >= endHour) {
    res.status(400).json({ error: 'Некорректный интервал времени' });
    return;
  }

  const { rows: seats } = await pool.query<Seat>(
    'SELECT id, seat_number, row_index, col_index, seat_type FROM seats WHERE location_id = $1 ORDER BY row_index, col_index',
    [id]
  );

  const { rows: occupied } = await pool.query<{ seat_id: number }>(
    `SELECT DISTINCT seat_id FROM booking_slots
     WHERE slot_date = $1 AND slot_hour >= $2 AND slot_hour < $3
       AND seat_id IN (SELECT id FROM seats WHERE location_id = $4)`,
    [date, startHour, endHour, id]
  );
  const occupiedSet = new Set(occupied.map((r) => r.seat_id));

  const result: SeatWithStatus[] = seats.map((s) => ({
    ...s,
    status: occupiedSet.has(s.id) ? 'occupied' : 'free',
  }));

  res.json(result);
});
