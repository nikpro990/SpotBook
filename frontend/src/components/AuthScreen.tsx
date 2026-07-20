import { useState, FormEvent } from 'react';
import { api, ApiError } from '../api';
import type { AuthUser } from '../types';

interface AuthScreenProps {
  onAuthed: (user: AuthUser) => void;
}

type Step = 'phone' | 'otp';

export default function AuthScreen({ onAuthed }: AuthScreenProps) {
  const [phone, setPhone] = useState('+375');
  const [code, setCode] = useState('');
  const [step, setStep] = useState<Step>('phone');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleRequestOtp(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api.requestOtp(phone);
      setStep('otp');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Не удалось отправить код');
    } finally {
      setLoading(false);
    }
  }

  async function handleVerify(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await api.verifyOtp(phone, code);
      localStorage.setItem('spotbook_token', data.token);
      onAuthed(data.user);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Не удалось подтвердить код');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="screen">
      <div>
        <span className="eyebrow">Вход в аккаунт</span>
        <h1 className="screen-title">Забронируйте своё место за пару кликов</h1>
        <p className="screen-sub">Вход по номеру телефона. Код подтверждения придёт СМС-сообщением.</p>
      </div>

      {error && <div className="error-banner">{error}</div>}

      {step === 'phone' && (
        <form onSubmit={handleRequestOtp} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label className="field-label">Номер телефона</label>
            <input
              className="input"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+375291234567"
              inputMode="tel"
            />
          </div>
          <button className="btn btn-primary" disabled={loading} type="submit">
            {loading ? <span className="spinner" /> : 'Получить код'}
          </button>
        </form>
      )}

      {step === 'otp' && (
        <form onSubmit={handleVerify} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label className="field-label">Код из СМС</label>
            <input
              className="input otp"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="······"
              inputMode="numeric"
              autoFocus
            />
            <p className="screen-sub" style={{ marginTop: 8 }}>
              Демо-режим: код также выводится в консоль backend-контейнера (реальный SMS-шлюз не подключён).
            </p>
          </div>
          <button className="btn btn-primary" disabled={loading || code.length < 6} type="submit">
            {loading ? <span className="spinner" /> : 'Подтвердить'}
          </button>
          <button type="button" className="btn btn-ghost" onClick={() => setStep('phone')}>
            Изменить номер
          </button>
        </form>
      )}
    </div>
  );
}
