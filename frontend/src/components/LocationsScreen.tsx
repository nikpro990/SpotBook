import { useEffect, useState } from 'react';
import { api, ApiError } from '../api';
import type { Location } from '../types';

interface LocationsScreenProps {
  onSelect: (location: Location) => void;
}

export default function LocationsScreen({ onSelect }: LocationsScreenProps) {
  const [locations, setLocations] = useState<Location[] | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .locations()
      .then(setLocations)
      .catch((e) => setError(e instanceof ApiError ? e.message : 'Не удалось загрузить залы'));
  }, []);

  return (
    <div className="screen">
      <div>
        <span className="eyebrow">Шаг 1 из 3</span>
        <h1 className="screen-title">Выберите зону</h1>
        <p className="screen-sub">Стоимость указана за одно место в час, в белорусских рублях.</p>
      </div>

      {error && <div className="error-banner">{error}</div>}

      {!locations && !error && <div className="empty-state">Загрузка залов…</div>}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {locations?.map((loc) => (
          <button key={loc.id} className="card location-card" onClick={() => onSelect(loc)}>
            <span className="name">{loc.name}</span>
            <span className="desc">{loc.description}</span>
            <span className="price">
              {Number(loc.price_per_hour_byn).toFixed(2)} BYN / час / место · {loc.rows * loc.cols} мест
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
