import { isBelarusianMobile, toGatewayFormat } from '../src/services/sms';

describe('isBelarusianMobile', () => {
  it.each(['+375291234567', '+375251234567', '+375331234567', '+375441234567'])(
    'accepts valid Belarusian mobile number %s',
    (phone) => {
      expect(isBelarusianMobile(phone)).toBe(true);
    }
  );

  it.each([
    '+79161234567', 
    '+375171234567', 
    '375291234567',
    '+3752912345', 
    'not-a-phone',
    '',
  ])('rejects invalid/non-Belarusian number %s', (phone) => {
    expect(isBelarusianMobile(phone)).toBe(false);
  });
});

describe('toGatewayFormat', () => {
  it('strips the + and any separators, leaving only digits', () => {
    expect(toGatewayFormat('+375 29-123-45-67')).toBe('375291234567');
    expect(toGatewayFormat('+375291234567')).toBe('375291234567');
  });
});
