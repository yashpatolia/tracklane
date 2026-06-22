export default function Stats({ applications }) {
  const total = applications.length;
  const applied = applications.filter((d) => !['Not Applied', 'Withdrawn'].includes(d.status)).length;
  const interviewing = applications.filter((d) => ['Interview', 'Offer'].includes(d.status)).length;
  const offers = applications.filter((d) => d.status === 'Offer').length;

  return (
    <div className="stats">
      <div className="flap-card">
        <div className="value">{total}</div>
        <div className="label">Tracked</div>
      </div>
      <div className="flap-card">
        <div className="value" style={{ color: 'var(--c-applied)' }}>{applied}</div>
        <div className="label">Applied</div>
      </div>
      <div className="flap-card">
        <div className="value" style={{ color: 'var(--c-interview)' }}>{interviewing}</div>
        <div className="label">Interviewing</div>
      </div>
      <div className="flap-card">
        <div className="value" style={{ color: 'var(--c-offer)' }}>{offers}</div>
        <div className="label">Offers</div>
      </div>
    </div>
  );
}
