import request from 'supertest';
import { createApp } from '../src/app';
import { pool } from '../src/db';

const app = createApp();

async function getLastOtpFromMockSms(phone: string): Promise<string> {
  const { rows } = await pool.query<{ message: string }>(
    'SELECT message FROM sms_log WHERE phone = $1 ORDER BY id DESC LIMIT 1',
    [phone]
  );
  const match = rows[0]?.message.match(/(\d{6})/);
  if (!match) throw new Error('OTP не найден в sms_log — проверьте mock-режим sms.ts');
  return match[1]!;
}

describe('auth flow', () => {
  const phone = '+375291234567';

  it('rejects non-Belarusian phone numbers', async () => {
    const res = await request(app).post('/api/auth/request-otp').send({ phone: '+79161234567' });
    expect(res.status).toBe(400);
  });

  it('completes the full request-otp -> verify-otp -> session flow', async () => {
    const requestRes = await request(app).post('/api/auth/request-otp').send({ phone });
    expect(requestRes.status).toBe(200);

    const code = await getLastOtpFromMockSms(phone);

    const verifyRes = await request(app).post('/api/auth/verify-otp').send({ phone, code });
    expect(verifyRes.status).toBe(200);
    expect(verifyRes.body.token).toBeDefined();
    expect(verifyRes.body.user.phone).toBe(phone);

    const sessionRes = await request(app).get('/api/auth/session').set('X-Session-Token', verifyRes.body.token);
    expect(sessionRes.status).toBe(200);
    expect(sessionRes.body.user.phone).toBe(phone);
  });

  it('rejects an incorrect OTP code and increments attempts', async () => {
    await request(app).post('/api/auth/request-otp').send({ phone });

    const wrongRes = await request(app).post('/api/auth/verify-otp').send({ phone, code: '000000' });
    expect(wrongRes.status).toBe(401);

    const correctCode = await getLastOtpFromMockSms(phone);
    const rightRes = await request(app).post('/api/auth/verify-otp').send({ phone, code: correctCode });
   
    expect(rightRes.status).toBe(200);
  });

  it('locks out after too many failed attempts', async () => {
    await request(app).post('/api/auth/request-otp').send({ phone });

    for (let i = 0; i < 5; i++) {
      await request(app).post('/api/auth/verify-otp').send({ phone, code: '000000' });
    }

    const correctCode = await getLastOtpFromMockSms(phone);
    const res = await request(app).post('/api/auth/verify-otp').send({ phone, code: correctCode });
    expect(res.status).toBe(429);
  });

  it('enforces a cooldown between OTP requests for the same number', async () => {
    await request(app).post('/api/auth/request-otp').send({ phone });
    const secondRes = await request(app).post('/api/auth/request-otp').send({ phone });
    expect(secondRes.status).toBe(429);
  });

  it('rejects an unknown or missing session token', async () => {
    const res = await request(app).get('/api/auth/session').set('X-Session-Token', 'not-a-real-token');
    expect(res.status).toBe(401);
  });
});
