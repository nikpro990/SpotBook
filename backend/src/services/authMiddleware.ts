import { RequestHandler } from 'express';
import { pool } from '../db';
import { hashSecret } from './crypto';

export const requireAuth: RequestHandler = async (req, res, next) => {
  const token = req.headers['x-session-token'];
  if (!token || typeof token !== 'string') {
    res.status(401).json({ error: 'Требуется авторизация' });
    return;
  }

  const tokenHash = hashSecret(token);
  const { rows } = await pool.query<{
    id: number;
    phone: string;
    name: string | null;
    session_expires_at: string;
  }>(
    'SELECT id, phone, name, session_expires_at FROM users WHERE session_token_hash = $1',
    [tokenHash]
  );
  const user = rows[0];

  if (!user || new Date(user.session_expires_at) < new Date()) {
    res.status(401).json({ error: 'Сессия недействительна или истекла, войдите снова' });
    return;
  }

  req.user = { id: user.id, phone: user.phone, name: user.name };
  next();
};
