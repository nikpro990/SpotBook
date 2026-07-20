import { useEffect, useState } from 'react';
import { api, ApiError } from './api';
import AuthScreen from './components/AuthScreen.tsx';
import LocationsScreen from './components/LocationsScreen.tsx';
import BookingScreen from './components/BookingScreen.tsx';
import CartScreen from './components/CartScreen.tsx';
import HistoryScreen from './components/HistoryScreen.tsx';
import type { AuthUser, Location, BookingDraft } from './types';

type Tab = 'book' | 'history';
type Stage = 'locations' | 'booking' | 'cart';

export default function App() {
  const [user, setUser] = useState<AuthUser | null | undefined>(undefined); // undefined = проверяем сессию
  const [tab, setTab] = useState<Tab>('book');
  const [location, setLocation] = useState<Location | null>(null);
  const [draft, setDraft] = useState<BookingDraft | null>(null);
  const [stage, setStage] = useState<Stage>('locations');

  useEffect(() => {
    const token = localStorage.getItem('spotbook_token');
    if (!token) {
      setUser(null);
      return;
    }
    api
      .session()
      .then((data) => setUser(data.user))
      .catch((e: unknown) => {
        if (e instanceof ApiError) {
          localStorage.removeItem('spotbook_token');
        }
        setUser(null);
      });
  }, []);

  function logout() {
    localStorage.removeItem('spotbook_token');
    setUser(null);
    setStage('locations');
    setLocation(null);
    setDraft(null);
  }

  function resetBookingFlow() {
    setStage('locations');
    setLocation(null);
    setDraft(null);
    setTab('book');
  }

  return (
    <div className="app-shell">
      <div className="topbar">
        <span className="brand">
          <span className="brand-mark" />
          SpotBook
        </span>
        {user && (
          <button
            style={{
              border: 'none',
              background: 'none',
              color: 'var(--text-muted)',
              fontFamily: 'var(--font-mono)',
              fontSize: 11,
              cursor: 'pointer',
            }}
            onClick={logout}
          >
            {user.phone} · выйти
          </button>
        )}
      </div>

      {user === undefined && <div className="empty-state">Проверяем сессию…</div>}

      {user === null && <AuthScreen onAuthed={setUser} />}

      {user && tab === 'book' && stage === 'locations' && (
        <LocationsScreen
          onSelect={(loc) => {
            setLocation(loc);
            setStage('booking');
          }}
        />
      )}

      {user && tab === 'book' && stage === 'booking' && location && (
        <BookingScreen
          location={location}
          onBack={() => setStage('locations')}
          onProceed={(d) => {
            setDraft(d);
            setStage('cart');
          }}
        />
      )}

      {user && tab === 'book' && stage === 'cart' && location && draft && (
        <CartScreen location={location} draft={draft} onBack={() => setStage('booking')} onDone={resetBookingFlow} />
      )}

      {user && tab === 'history' && <HistoryScreen />}

      {user && (
        <div className="tabbar">
          <button
            className={tab === 'book' ? 'active' : ''}
            onClick={() => {
              setTab('book');
              setStage('locations');
            }}
          >
            Бронирование
          </button>
          <button className={tab === 'history' ? 'active' : ''} onClick={() => setTab('history')}>
            История
          </button>
        </div>
      )}
    </div>
  );
}
