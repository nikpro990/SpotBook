import { useEffect, useMemo, useState } from 'react';
import { api, ApiError } from '../api';
import type { Location, SeatWithStatus, BookingDraft } from '../types';

interface BookingScreenProps {
  location: Location;
  onBack: () => void;
  onProceed: (draft: BookingDraft) => void;
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

const HOURS = Array.from({ length: 15 }, (_, i) => i + 8); // 08:00 .. 22:00

export default function BookingScreen({ location, onBack, onProceed }: BookingScreenProps) {
  const [date, setDate] = useState(todayISO());
  const [startHour, setStartHour] = useState(10);
  const [endHour, setEndHour] = useState(12);
  const [seats, setSeats] = useState<SeatWithStatus[] | null>(null);
  const [selected, setSelected] = useState<SeatWithStatus[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setSelected([]);
    setError('');
    setLoading(true);
    api
      .seats(location.id, date, startHour, endHour)
      .then(setSeats)
      .catch((e) => setError(e instanceof ApiError ? e.message : 'Не удалось загрузить карту мест'))
      .finally(() => setLoading(false));
  }, [location.id, date, startHour, endHour]);

  function toggleSeat(seat: SeatWithStatus) {
    if (seat.status === 'occupied') return;
    setSelected((prev) =>
      prev.some((s) => s.id === seat.id) ? prev.filter((s) => s.id !== seat.id) : [...prev, seat]
    );
  }

  const totalPrice = useMemo(() => {
    const hours = endHour - startHour;
    return selected.length * hours * Number(location.price_per_hour_byn);
  }, [selected, startHour, endHour, location]);

  return (
    <div className="screen" style={{ paddingBottom: 0 }}>
      <div>
        <span className="eyebrow">Шаг 2 из 3</span>
        <h1 className="screen-title">{location.name}</h1>
        <p className="screen-sub">Отметьте свободные места на карте зала.</p>
      </div>

      <div className="controls-row">
        <div>
          <label className="field-label">Дата</label>
          <input
            className="input"
            type="date"
            value={date}
            min={todayISO()}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>
      </div>
      <div className="controls-row">
        <div>
          <label className="field-label">С</label>
          <select className="input" value={startHour} onChange={(e) => setStartHour(Number(e.target.value))}>
            {HOURS.filter((h) => h < endHour).map((h) => (
              <option key={h} value={h}>
                {String(h).padStart(2, '0')}:00
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="field-label">До</label>
          <select className="input" value={endHour} onChange={(e) => setEndHour(Number(e.target.value))}>
            {HOURS.filter((h) => h > startHour).map((h) => (
              <option key={h} value={h}>
                {String(h).padStart(2, '0')}:00
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="legend">
        <span className="legend-item">
          <span className="legend-dot" style={{ background: 'var(--free)' }} />
          Свободно
        </span>
        <span className="legend-item">
          <span className="legend-dot" style={{ background: 'var(--occupied)' }} />
          Занято
        </span>
        <span className="legend-item">
          <span className="legend-dot" style={{ background: 'var(--selected)' }} />
          Выбрано
        </span>
      </div>

      {error && <div className="error-banner">{error}</div>}

      <div className="seat-map-wrap">
        {loading && <div className="empty-state">Обновляем карту мест…</div>}
        {!loading && seats && (
          <div className="seat-grid" style={{ gridTemplateColumns: `repeat(${location.cols}, 38px)` }}>
            {seats.map((seat) => {
              const isSelected = selected.some((s) => s.id === seat.id);
              const cls = `seat ${isSelected ? 'selected' : seat.status} ${
                seat.seat_type === 'vip' ? 'vip' : ''
              }`;
              return (
                <button
                  key={seat.id}
                  className={cls}
                  disabled={seat.status === 'occupied'}
                  onClick={() => toggleSeat(seat)}
                  title={seat.seat_type === 'vip' ? 'VIP-место' : 'Стандартное место'}
                >
                  {seat.seat_number}
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div className="bottom-bar">
        <button className="btn btn-ghost" onClick={onBack}>
          Назад
        </button>
        <div style={{ flex: 1, textAlign: 'right' }}>
          <div className="screen-sub">
            {selected.length} мест · {totalPrice.toFixed(2)} BYN
          </div>
        </div>
        <button
          className="btn btn-primary"
          disabled={selected.length === 0}
          onClick={() => onProceed({ date, startHour, endHour, selected, totalPrice })}
        >
          Далее
        </button>
      </div>
    </div>
  );
}
