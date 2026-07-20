import crypto from 'crypto';

export function hashSecret(value: string): string {
  return crypto.createHash('sha256').update(value).digest('hex');
}

export function generateSessionToken(): string {
  return crypto.randomBytes(32).toString('hex'); 
}

export function generateOtp(): string {
  return String(crypto.randomInt(100000, 1000000));
}

export function timingSafeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a, 'utf8');
  const bufB = Buffer.from(b, 'utf8');
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}
