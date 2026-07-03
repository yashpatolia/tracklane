import { useEffect, useState } from 'react';

function formatClock(date) {
  const hh = String(date.getHours()).padStart(2, '0');
  const mm = String(date.getMinutes()).padStart(2, '0');
  const ss = String(date.getSeconds()).padStart(2, '0');
  return `${hh}:${mm}:${ss}`;
}

export default function Header({ user, onLogout }) {
  const [time, setTime] = useState(() => formatClock(new Date()));

  useEffect(() => {
    const id = setInterval(() => setTime(formatClock(new Date())), 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <header className="app-header">
      <div className="app-header__left">
        <div className="live-dot">
          <span className="live-dot__ring" />
          <span className="live-dot__core" />
        </div>
        <div>
          <h1 className="app-title">Tracklane</h1>
          <p className="app-meta">{user?.name || user?.email}</p>
        </div>
      </div>
      <div className="app-header__right">
        <div className="app-clock">
          <span>{time}</span>
          <span className="zone">Local time</span>
        </div>
        {user && (
          <button className="btn-logout" onClick={onLogout} title={user.email}>
            Sign out
          </button>
        )}
      </div>
    </header>
  );
}
