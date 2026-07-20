import { hashSecret, generateSessionToken, generateOtp, timingSafeEqual } from '../src/services/crypto';

describe('crypto helpers', () => {
  it('hashSecret produces a stable, deterministic hash', () => {
    const a = hashSecret('123456');
    const b = hashSecret('123456');
    expect(a).toBe(b);
    expect(a).toHaveLength(64); // sha256 hex
  });

  it('hashSecret produces different hashes for different inputs', () => {
    expect(hashSecret('123456')).not.toBe(hashSecret('654321'));
  });

  it('generateSessionToken returns 256 bits of entropy as hex', () => {
    const token = generateSessionToken();
    expect(token).toHaveLength(64);
    expect(generateSessionToken()).not.toBe(token); // практически никогда не совпадут
  });

  it('generateOtp returns a 6-digit numeric string', () => {
    for (let i = 0; i < 20; i++) {
      const otp = generateOtp();
      expect(otp).toMatch(/^\d{6}$/);
    }
  });

  it('timingSafeEqual matches identical strings', () => {
    expect(timingSafeEqual('abc', 'abc')).toBe(true);
  });

  it('timingSafeEqual rejects differing strings', () => {
    expect(timingSafeEqual('abc', 'abd')).toBe(false);
  });

  it('timingSafeEqual rejects strings of different length without throwing', () => {
    expect(timingSafeEqual('abc', 'ab')).toBe(false);
  });
});
