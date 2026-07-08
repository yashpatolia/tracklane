import { useMemo } from 'react';

const FUNNEL = [
  { status: 'Applied',      color: 'var(--s-applied)' },
  { status: 'OA',           color: 'var(--s-oa)' },
  { status: 'Phone Screen', color: 'var(--s-phone)' },
  { status: 'Interview',    color: 'var(--s-interview)' },
  { status: 'Offer',        color: 'var(--s-offer)' },
];

export const REJECTED_SENTINEL = '__rejected__';

export default function Pipeline({ applications, activeFilter, onFilterChange, compact = false }) {
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
    <div className={`pipeline-v${compact ? ' pipeline-v--compact' : ''}`}>
      {!compact && (
        <div className="pipeline-v__head">
          <span className="pipeline-v__title">Route</span>
          {activeFilter && (
            <button className="pipeline-clear" onClick={() => onFilterChange(null)}>
              Clear ×
            </button>
          )}
        </div>
      )}
      <div className="pipeline-v__body">
        <div className="v-line">
          {FUNNEL.map((stage, i) => {
            const count = counts[stage.status] || 0;
            const isLast = i === FUNNEL.length - 1 && rejectedCount === 0;
            return (
              <div key={stage.status} className="v-stage">
                <div className="v-stage__rail">
                  <span
                    className={`v-node${count === 0 ? ' v-node--empty' : ''}${activeFilter === stage.status ? ' v-node--active' : ''}`}
                    style={{ '--stage-color': stage.color }}
                  />
                  {!isLast && <span className="v-track" style={{ '--track-color': stage.color, opacity: count > 0 ? 1 : 0.35 }} />}
                </div>
                <button
                  type="button"
                  className={`v-stage__btn${activeFilter === stage.status ? ' active' : ''}`}
                  onClick={() => toggle(stage.status)}
                  title={`Filter by ${stage.status}`}
                >
                  <span className="v-count" style={{ color: stage.color }}>{count}</span>
                  <span className="v-label">{stage.status}</span>
                </button>
              </div>
            );
          })}

          {rejectedCount > 0 && (
            <div className="v-stage v-stage--branch">
              <div className="v-stage__rail">
                <span
                  className={`v-node${activeFilter === REJECTED_SENTINEL ? ' v-node--active' : ''}`}
                  style={{ '--stage-color': 'var(--s-rejected)' }}
                />
              </div>
              <button
                type="button"
                className={`v-stage__btn${activeFilter === REJECTED_SENTINEL ? ' active' : ''}`}
                onClick={() => toggle(REJECTED_SENTINEL)}
                title="Filter rejected / withdrawn"
              >
                <span className="v-count" style={{ color: 'var(--s-rejected)' }}>{rejectedCount}</span>
                <span className="v-label">Rejected</span>
              </button>
            </div>
          )}
        </div>
        {compact && activeFilter && (
          <button className="pipeline-clear pipeline-clear--compact" onClick={() => onFilterChange(null)}>
            Clear ×
          </button>
        )}
      </div>
    </div>
  );
}
