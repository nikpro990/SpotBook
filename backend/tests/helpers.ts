import { pool } from '../src/db';
import { hashSecret, generateSessionToken } from '../src/services/crypto';

export interface SeededLocation {
  id: number;
  seatIds: number[];
}

export async function seedLocation(
  opts: { name?: string; price?: number; rows?: number; cols?: number } = {}
): Promise<SeededLocation> {
  const { name = 'Тестовый зал', price = 5, rows = 2, cols = 3 } = opts;

  const { rows: locRows } = await pool.query<{ id: number }>(
    `INSERT INTO locations (name, description, price_per_hour_byn, rows, cols)
     VALUES ($1, $2, $3, $4, $5) RETURNING id`,
    [name, 'Зал для тестов', price, rows, cols]
  );
  const locationId = locRows[0]!.id;

  const seatIds: number[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const { rows: seatRows } = await pool.query<{ id: number }>(
        `INSERT INTO seats (location_id, seat_number, row_index, col_index, seat_type)
         VALUES ($1, $2, $3, $4, 'standard') RETURNING id`,
        [locationId, `${String.fromCharCode(65 + r)}${c + 1}`, r, c]
      );
      seatIds.push(seatRows[0]!.id);
    }
  }

  return { id: locationId, seatIds };
}

export async function createAuthedUser(phone = '+375291234567'): Promise<{ token: string; userId: number }> {
  const token = generateSessionToken();
  const tokenHash = hashSecret(token);
  const sessionExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  const { rows } = await pool.query<{ id: number }>(
    `INSERT INTO users (phone, session_token_hash, session_expires_at)
     VALUES ($1, $2, $3) RETURNING id`,
    [phone, tokenHash, sessionExpiresAt]
  );

  return { token, userId: rows[0]!.id };
}

export function futureDateISO(daysFromNow: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + daysFromNow);
  return d.toISOString().slice(0, 10);
}
