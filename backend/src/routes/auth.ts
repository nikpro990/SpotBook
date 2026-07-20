import { Router } from 'express';
import { z } from 'zod';
import { pool } from '../db';
import { sendSms, isBelarusianMobile } from '../services/sms';
import { hashSecret, generateSessionToken, generateOtp, timingSafeEqual } from '../services/crypto';

export const authRouter = Router();

const OTP_TTL_MS = 5 * 60 * 1000; 
const OTP_RESEND_COOLDOWN_MS = 60 * 1000; 
const OTP_MAX_ATTEMPTS = 5; 
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; 

const phoneSchema = z.string().refine(isBelarusianMobile, {
  message: 'Укажите белорусский мобильный номер в формате +375291234567 (коды 25, 29, 33, 44)',
});

interface UserRow {
  id: number;
  phone: string;
  name: string | null;
  otp_code_hash: string | null;
  otp_expires_at: string | null;
  otp_attempts: number;
  otp_last_sent_at: string | null;
}

authRouter.post('/request-otp', async (req, res) => {
  const parsed = z.object({ phone: phoneSchema }).safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.errors[0]?.message ?? 'Некорректные данные' });
    return;
  }
  const { phone } = parsed.data;

  const { rows: existing } = await pool.query<Pick<UserRow, 'otp_last_sent_at'>>(
    'SELECT otp_last_sent_at FROM users WHERE phone = $1',
    [phone]
  );
  const lastSentAt = existing[0]?.otp_last_sent_at;
  if (lastSentAt) {
    const elapsed = Date.now() - new Date(lastSentAt).getTime();
    if (elapsed < OTP_RESEND_COOLDOWN_MS) {
      const waitSec = Math.ceil((OTP_RESEND_COOLDOWN_MS - elapsed) / 1000);
      res.status(429).json({ error: `Код уже отправлен. Повторный запрос будет доступен через ${waitSec} с.` });
      return;
    }
  }

  const otp = generateOtp();
  const otpHash = hashSecret(otp);
  const expiresAt = new Date(Date.now() + OTP_TTL_MS);

  await pool.query(
    `INSERT INTO users (phone, otp_code_hash, otp_expires_at, otp_attempts, otp_last_sent_at)
     VALUES ($1, $2, $3, 0, now())
     ON CONFLICT (phone) DO UPDATE
       SET otp_code_hash = $2, otp_expires_at = $3, otp_attempts = 0, otp_last_sent_at = now()`,
    [phone, otpHash, expiresAt]
  );

  await sendSms(phone, `SpotBook: ваш код подтверждения — ${otp}. Действителен 5 минут. Никому не сообщайте этот код.`);

  res.json({ ok: true, message: 'Код отправлен по СМС' });
});


authRouter.post('/verify-otp', async (req, res) => {
  const parsed = z
    .object({
      phone: phoneSchema,
      code: z.string().regex(/^\d{6}$/, 'Код должен состоять из 6 цифр'),
    })
    .safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.errors[0]?.message ?? 'Некорректные данные' });
    return;
  }
  const { phone, code } = parsed.data;

  const { rows } = await pool.query<UserRow>('SELECT * FROM users WHERE phone = $1', [phone]);
  const user = rows[0];

  const genericError = { error: 'Неверный или истёкший код' };

  if (!user || !user.otp_code_hash || !user.otp_expires_at || new Date(user.otp_expires_at) < new Date()) {
    res.status(401).json(genericError);
    return;
  }

  if (user.otp_attempts >= OTP_MAX_ATTEMPTS) {
    res.status(429).json({ error: 'Слишком много неверных попыток. Запросите новый код.' });
    return;
  }

  if (!timingSafeEqual(hashSecret(code), user.otp_code_hash)) {
    await pool.query('UPDATE users SET otp_attempts = otp_attempts + 1 WHERE id = $1', [user.id]);
    res.status(401).json(genericError);
    return;
  }

  const token = generateSessionToken();
  const tokenHash = hashSecret(token);
  const sessionExpiresAt = new Date(Date.now() + SESSION_TTL_MS);

  await pool.query(
    `UPDATE users
     SET session_token_hash = $1, session_expires_at = $2,
         otp_code_hash = NULL, otp_expires_at = NULL, otp_attempts = 0
     WHERE id = $3`,
    [tokenHash, sessionExpiresAt, user.id]
  );

  res.json({ ok: true, token, user: { id: user.id, phone: user.phone, name: user.name } });
});

authRouter.get('/session', async (req, res) => {
  const token = req.headers['x-session-token'];
  if (!token || typeof token !== 'string') {
    res.status(401).json({ error: 'Нет токена сессии' });
    return;
  }

  const tokenHash = hashSecret(token);
  const { rows } = await pool.query<{
    id: number;
    phone: string;
    name: string | null;
    session_expires_at: string;
  }>('SELECT id, phone, name, session_expires_at FROM users WHERE session_token_hash = $1', [tokenHash]);
  const user = rows[0];
  if (!user || new Date(user.session_expires_at) < new Date()) {
    res.status(401).json({ error: 'Сессия недействительна или истекла' });
    return;
  }

  res.json({ ok: true, user: { id: user.id, phone: user.phone, name: user.name } });
});
