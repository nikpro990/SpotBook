import { Pool } from 'pg';

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
});

export async function waitForDb(retries = 20, delayMs = 1500): Promise<void> {
  for (let i = 0; i < retries; i++) {
    try {
      await pool.query('SELECT 1');
      console.log('[db] соединение с PostgreSQL установлено');
      return;
    } catch {
      console.log(`[db] БД ещё не готова (попытка ${i + 1}/${retries})...`);
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }
  throw new Error('Не удалось подключиться к базе данных после нескольких попыток');
}
