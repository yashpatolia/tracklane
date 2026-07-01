import { useMemo } from 'react';

const FUNNEL = [
  { status: 'Applied',      color: 'var(--s-applied)' },
  { status: 'OA',           color: 'var(--s-oa)' },
  { status: 'Phone Screen', color: 'var(--s-phone)' },
  { status: 'Interview',    color: 'var(--s-interview)' },
  { status: 'Offer',        color: 'var(--s-offer)' },
];

export const REJECTED_SENTINEL = '__rejected__';

export default function Pipeline({ applications, activeFilter, onFilterChange }) {
  const counts = useMemo(() => {
    const map = {};
    for (const app of applications) {
      map[app.status] = (map[app.status] || 0) + 1;
    }
    return map;
  }, [applications]);

  const rejectedCount = (counts['Rejected'] || 0) + (counts['Withdrawn'] || 0);

  const toggle = (key) => onFilterChange(activeFilter === key ? null : key);

  return (
    <div className="pipeline">
      <div className="pipeline-funnel">
        {FUNNEL.map((stage, i) => (
          <div key={stage.status} className="pipeline-stage-wrap">
            <button
              className={`pipeline-stage${activeFilter === stage.status ? ' active' : ''}`}
              style={{ '--stage-color': stage.color }}
              onClick={() => toggle(stage.status)}
              title={`Filter by ${stage.status}`}
            >
              <span className="pipeline-count">{counts[stage.status] || 0}</span>
              <span className="pipeline-label">{stage.status}</span>
            </button>
            {i < FUNNEL.length - 1 && <span className="pipeline-arrow">›</span>}
          </div>
        ))}

        {rejectedCount > 0 && (
          <>
            <span className="pipeline-divider" />
            <button
              className={`pipeline-stage${activeFilter === REJECTED_SENTINEL ? ' active' : ''}`}
              style={{ '--stage-color': 'var(--s-rejected)' }}
              onClick={() => toggle(REJECTED_SENTINEL)}
              title="Filter rejected / withdrawn"
            >
              <span className="pipeline-count">{rejectedCount}</span>
              <span className="pipeline-label">Rejected</span>
            </button>
          </>
        )}
      </div>

      {activeFilter && (
        <button className="pipeline-clear" onClick={() => onFilterChange(null)}>
          Clear filter ×
        </button>
      )}
    </div>
  );
}
