import { fmtDate, slug } from '../constants.js';

function DateCell({ value }) {
  const formatted = fmtDate(value);
  return formatted ? <span className="date-text">{formatted}</span> : <span className="empty-date">--</span>;
}

export default function ApplicationsTable({ applications, onEdit, onDelete }) {
  return (
    <div className="board-wrap">
      <table>
        <thead>
          <tr>
            <th>Destination / Role</th>
            <th>Status</th>
            <th>Stack</th>
            <th>Comp</th>
            <th>Applied</th>
            <th>Notes</th>
            <th></th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {applications.length === 0 ? (
            <tr>
              <td colSpan="7">
                <div className="empty-state">
                  <span className="big">Board clear</span>
                  No applications logged. Press "+ New Entry" to start tracking.
                </div>
              </td>
            </tr>
          ) : (
            applications.map((r, i) => (
              <tr key={i} onClick={() => onEdit(i)}>
                <td>
                  <div className="company-name">{r.company}</div>
                  <div className="role-text">
                    {r.role}
                    {r.location ? ` · ${r.location}` : ''}
                  </div>
                </td>
                <td>
                  <span className={`chip chip-${slug(r.status)}`}>{r.status}</span>
                </td>
                <td>
                  <span className="stack-text">{r.stack || ''}</span>
                </td>
                <td>
                  {r.comp ? <span className="comp-text">${r.comp}/hr</span> : <span className="comp-empty">--</span>}
                </td>
                <td>
                  <DateCell value={r.applied} />
                </td>
                <td>
                  <span className="notes-text" title={r.notes || ''}>
                    {r.notes || '--'}
                  </span>
                </td>
                <td className="link-cell">
                  {r.link && (
                    <button
                      className="link-btn"
                      title="View application status"
                      onClick={(e) => {
                        e.stopPropagation();
                        window.open(r.link, '_blank', 'noopener,noreferrer');
                      }}
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                        <polyline points="15 3 21 3 21 9" />
                        <line x1="10" y1="14" x2="21" y2="3" />
                      </svg>
                    </button>
                  )}
                </td>
                <td className="del-cell">
                  <button
                    className="row-del"
                    title="Delete"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(i);
                    }}
                  >
                    &times;
                  </button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
