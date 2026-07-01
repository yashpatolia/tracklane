import { useMemo } from 'react';
import { fmtDate } from '../constants.js';

function TickerItems({ applied }) {
  return applied.map((d, i) => (
    <span className="ticker-item" key={i}>
      {i > 0 && <span className="ticker-sep">&bull;</span>}
      <strong>{d.company}</strong> - applied {fmtDate(d.applied)}
    </span>
  ));
}

export default function Ticker({ applications }) {
  const applied = useMemo(
    () =>
      applications
        .filter((d) => d.applied)
        .sort((a, b) => b.applied.localeCompare(a.applied)),
    [applications]
  );

  if (!applied.length) {
    return (
      <div className="ticker">
        <span className="ticker-label">Recently applied</span>
        <div className="ticker-track idle">
          <span className="ticker-item">No applications logged yet - add one to start tracking.</span>
        </div>
      </div>
    );
  }

  const duration = Math.max(18, applied.length * 6);

  return (
    <div className="ticker">
      <span className="ticker-label">Recently applied</span>
      <div className="ticker-track" style={{ '--ticker-duration': `${duration}s` }}>
        <TickerItems applied={applied} />
        <span className="ticker-sep">&bull;</span>
        <TickerItems applied={applied} />
      </div>
    </div>
  );
}
