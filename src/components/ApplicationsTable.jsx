import { useMemo, useState } from 'react';
import { fmtDate, slug } from '../constants.js';
import CompanyLogo from './CompanyLogo.jsx';

function DateCell({ value }) {
  const formatted = fmtDate(value);
  return formatted
    ? <span className="date-text">{formatted}</span>
    : <span className="empty-date">--</span>;
}

const COLS = [
  { key: 'company', label: 'Destination / Role' },
  { key: 'status',  label: 'Status' },
  { key: 'stack',   label: 'Stack' },
  { key: 'comp',    label: 'Comp' },
  { key: 'applied', label: 'Applied' },
  { key: 'notes',   label: 'Notes' },
];

function SortIcon({ dir }) {
  if (!dir) return <span className="sort-icon sort-icon--idle">↕</span>;
  return <span className="sort-icon sort-icon--active">{dir === 1 ? '↑' : '↓'}</span>;
}

export default function ApplicationsTable({ applications, onEdit, onDelete }) {
  const [sort, setSort] = useState({ col: null, dir: 1 });

  const toggleSort = (col) => {
    setSort((prev) => {
      if (prev.col !== col) return { col, dir: 1 };
      if (prev.dir === 1) return { col, dir: -1 };
      return { col: null, dir: 1 };
    });
  };

  const sorted = useMemo(() => {
    if (!sort.col) return applications;
    return [...applications].sort((a, b) => {
      const av = (a[sort.col] ?? '').toString().toLowerCase();
      const bv = (b[sort.col] ?? '').toString().toLowerCase();
      return av < bv ? -sort.dir : av > bv ? sort.dir : 0;
    });
  }, [applications, sort]);

  return (
    <div className="board-wrap">
      <table>
        <thead>
          <tr>
            {COLS.map((c) => (
              <th
                key={c.key}
                className="sortable-th"
                onClick={() => toggleSort(c.key)}
                title={`Sort by ${c.label}`}
              >
                {c.label}
                <SortIcon dir={sort.col === c.key ? sort.dir : null} />
              </th>
            ))}
            <th></th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {sorted.length === 0 ? (
            <tr>
              <td colSpan="8">
                <div className="empty-state">
                  <span className="big">Board clear</span>
                  No applications logged. Press "+ New Entry" to start tracking.
                </div>
              </td>
            </tr>
          ) : (
            sorted.map((r, i) => (
              <tr key={i} onClick={() => onEdit(i)} className={`status-row--${slug(r.status)}`}>
                <td>
                  <div className="company-cell">
                    <CompanyLogo name={r.company} />
                    <div>
                      <div className="company-name">{r.company}</div>
                      <div className="role-text">
                        {r.role}
                        {r.location ? ` · ${r.location}` : ''}
                      </div>
                    </div>
                  </div>
                </td>
                <td>
                  <span className={`chip chip-${slug(r.status)}`}>{r.status}</span>
                </td>
                <td>
                  <span className="stack-text">{r.stack || ''}</span>
                </td>
                <td>
                  {r.comp
                    ? <span className="comp-text">${r.comp}/hr</span>
                    : <span className="comp-empty">--</span>}
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
                    onClick={(e) => { e.stopPropagation(); onDelete(i); }}
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
