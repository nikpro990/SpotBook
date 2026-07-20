import { useEffect, useState } from 'react';
import { api, ApiError } from '../api';
import type { BookingSummary } from '../types';

export default function HistoryScreen() {
  const [items, setItems] = useState<BookingSummary[] | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .myBookings()
      .then(setItems)
      .catch((e) => setError(e instanceof ApiError ? e.message : 'Не удалось загрузить историю'));
  }, []);

  return (
    <div className="screen">
      <div>
        <span className="eyebrow">Мои визиты</span>
        <h1 className="screen-title">История бронирований</h1>
      </div>

      {error && <div className="error-banner">{error}</div>}
      {!items && !error && <div className="empty-state">Загрузка…</div>}
      {items && items.length === 0 && (
        <div className="empty-state">Пока нет бронирований — самое время выбрать место.</div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {items?.map((b) => (
          <div key={b.id} className="card history-item">
            <div className="top-line">
              <span>{b.location_name}</span>
              <span>{Number(b.total_price_byn).toFixed(2)} BYN</span>
            </div>
            <span className="meta">
              {new Date(b.booking_date).toLocaleDateString('ru-RU')} · {String(b.start_hour).padStart(2, '0')}:00–
              {String(b.end_hour).padStart(2, '0')}:00 · места {b.seats.join(', ')}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
