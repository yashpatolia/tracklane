export default function Stats({ applications }) {
  const total        = applications.length;
  const applied      = applications.filter((d) => !['Not Applied', 'Withdrawn'].includes(d.status)).length;
  const interviewing = applications.filter((d) => ['Interview', 'Offer'].includes(d.status)).length;
  const offers       = applications.filter((d) => d.status === 'Offer').length;
  const rate         = applied > 0 ? Math.round((interviewing / applied) * 100) : 0;

  const bar = (n, color) => (
    <div className="stat-bar">
      <div
        className="stat-bar__fill"
        style={{
          width: total > 0 ? `${Math.round((n / total) * 100)}%` : '0%',
          background: color,
        }}
      />
    </div>
  );

  return (
    <div className="stats">
      <div className="stat-card">
        <div className="stat-value">{total}</div>
        <div className="stat-label">Tracked</div>
        {bar(total, 'var(--violet)')}
      </div>
      <div className="stat-card">
        <div className="stat-value stat-value--colored" style={{ '--stat-color': 'var(--s-applied)' }}>{applied}</div>
        <div className="stat-label">Applied</div>
        {bar(applied, 'var(--s-applied)')}
      </div>
      <div className="stat-card">
        <div className="stat-value stat-value--colored" style={{ '--stat-color': 'var(--s-interview)' }}>{interviewing}</div>
        <div className="stat-label">Interviewing</div>
        {bar(interviewing, 'var(--s-interview)')}
      </div>
      <div className="stat-card">
        <div className="stat-value stat-value--colored" style={{ '--stat-color': 'var(--s-offer)' }}>{offers}</div>
        <div className="stat-label">Offers</div>
        {bar(offers, 'var(--s-offer)')}
      </div>
      <div className="stat-card">
        <div className="stat-value stat-value--colored" style={{ '--stat-color': 'var(--s-phone)' }}>
          {rate}<span style={{ fontSize: '18px', fontWeight: 300, opacity: 0.6 }}>%</span>
        </div>
        <div className="stat-label">Interview rate</div>
        {bar(interviewing, 'var(--s-phone)')}
      </div>
    </div>
  );
}
