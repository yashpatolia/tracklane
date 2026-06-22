import { useEffect, useState } from 'react';

function formatClock(date) {
  const hh = String(date.getHours()).padStart(2, '0');
  const mm = String(date.getMinutes()).padStart(2, '0');
  const ss = String(date.getSeconds()).padStart(2, '0');
  return `${hh}:${mm}:${ss}`;
}

export default function Header() {
  const [time, setTime] = useState(() => formatClock(new Date()));

  useEffect(() => {
    const id = setInterval(() => setTime(formatClock(new Date())), 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <header className="board-header">
      <div>
        <div className="board-title">Internship Departures</div>
        <div className="board-subtitle">Yash Patolia &middot; January 2027 start &middot; McMaster SWE Co-op</div>
      </div>
      <div className="board-clock">
        <span>{time}</span>
        <span className="zone">Local time</span>
      </div>
    </header>
  );
}
