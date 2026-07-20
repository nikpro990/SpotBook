import { useState } from 'react';
import { api, ApiError } from '../api';
import type { Location, BookingDraft, CreateBookingResponse } from '../types';

interface CartScreenProps {
  location: Location;
  draft: BookingDraft;
  onBack: () => void;
  onDone: () => void;
}

export default function CartScreen({ location, draft, onBack, onDone }: CartScreenProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<CreateBookingResponse | null>(null);

  async function confirm() {
    setLoading(true);
    setError('');
    try {
      const res = await api.createBooking({
        location_id: location.id,
        date: draft.date,
        start_hour: draft.startHour,
        end_hour: draft.endHour,
        seat_ids: draft.selected.map((s) => s.id),
      });
      setResult(res);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Не удалось создать бронь');
    } finally {
      setLoading(false);
    }
  }

  if (result) {
    return (
      <div className="screen">
        <div className="confirm-banner">
          <div className="confirm-icon">✓</div>
          <h1 className="screen-title">Бронь подтверждена</h1>
          <p className="screen-sub">Мы отправили детали визита СМС-сообщением на ваш номер.</p>
        </div>
        <div className="card">
          <div className="summary-row">
            <span className="label">Зона</span>
            <span className="value">{location.name}</span>
          </div>
          <div className="summary-row">
            <span className="label">Места</span>
            <span className="value">{result.seats.join(', ')}</span>
          </div>
          <div className="summary-row">
            <span className="label">Итого</span>
            <span className="value">{Number(result.total_price_byn).toFixed(2)} BYN</span>
          </div>
        </div>
        <button className="btn btn-primary" onClick={onDone}>
          Готово
        </button>
      </div>
    );
  }

  return (
    <div className="screen">
      <div>
        <span className="eyebrow">Шаг 3 из 3</span>
        <h1 className="screen-title">Подтверждение брони</h1>
      </div>

      {error && <div className="error-banner">{error}</div>}

      <div className="card">
        <div className="summary-row">
          <span className="label">Зона</span>
          <span className="value">{location.name}</span>
        </div>
        <div className="summary-row">
          <span className="label">Дата</span>
          <span className="value">{draft.date}</span>
        </div>
        <div className="summary-row">
          <span className="label">Время</span>
          <span className="value">
            {String(draft.startHour).padStart(2, '0')}:00–{String(draft.endHour).padStart(2, '0')}:00
          </span>
        </div>
        <div className="summary-row">
          <span className="label">Места</span>
          <span className="value">{draft.selected.map((s) => s.seat_number).join(', ')}</span>
        </div>
        <div className="total-row">
          <span className="label">К оплате</span>
          <span className="value">{draft.totalPrice.toFixed(2)} BYN</span>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <button className="btn btn-primary" disabled={loading} onClick={confirm}>
          {loading ? <span className="spinner" /> : 'Забронировать'}
        </button>
        <button className="btn btn-ghost" onClick={onBack} disabled={loading}>
          Назад к карте
        </button>
      </div>
    </div>
  );
}
