import { pool } from '../db';


const BY_MOBILE_RE = /^\+375(25|29|33|44)\d{7}$/;

export function isBelarusianMobile(phone: string): boolean {
  return BY_MOBILE_RE.test(phone);
}

export function toGatewayFormat(phone: string): string {
  return phone.replace(/[^\d]/g, '');
}

export interface SmsResult {
  ok: boolean;
  mode?: 'mock' | 'live';
  error?: string;
}

export async function sendSms(phone: string, message: string): Promise<SmsResult> {
  if (!isBelarusianMobile(phone)) {
    console.warn(`[sms:REJECTED] Номер ${phone} не является белорусским мобильным (+375 25/29/33/44)`);
    return { ok: false, error: 'Отправка возможна только на белорусские мобильные номера (+375)' };
  }

  const gatewayNumber = toGatewayFormat(phone); 
  const gatewayUrl = process.env.SMS_GATEWAY_URL;
  const apiKey = process.env.SMS_GATEWAY_API_KEY;

  await pool.query('INSERT INTO sms_log (phone, message) VALUES ($1, $2)', [phone, message]);

  if (!gatewayUrl || !apiKey) {
    console.log(`[sms:MOCK] -> ${gatewayNumber}: ${message}`);
    return { ok: true, mode: 'mock' };
  }

  try {
    const res = await fetch(gatewayUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ to: gatewayNumber, text: message }),
    });
    if (!res.ok) throw new Error(`Gateway responded ${res.status}`);
    return { ok: true, mode: 'live' };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'unknown error';
    console.error('[sms:ERROR]', message);
    return { ok: false, error: message };
  }
}
