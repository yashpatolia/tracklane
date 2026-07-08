import { useEffect, useMemo, useState } from 'react';
import { COMP_PERIOD_SUFFIX, fmtDate, slug } from '../constants.js';
import {
  formatRelativeStamp,
  getDeadlineState,
  getEmptyStateCopy,
  shortenLocation,
} from '../utils/applications.js';
import CompanyLogo from './CompanyLogo.jsx';

const BASE_COLUMNS = [
  { key: 'company', label: 'Destination / Role', fixed: true },
  { key: 'status', label: 'Status', fixed: true },
  { key: 'applied', label: 'Applied', fixed: true },
];

const OPTIONAL_COLUMNS = [
  { key: 'season', label: 'Season' },
  { key: 'stack', label: 'Stack' },
  { key: 'comp', label: 'Comp' },
  { key: 'nextAction', label: 'Next Action' },
  { key: 'updatedAt', label: 'Updated' },
  { key: 'notes', label: 'Notes' },
];

const STORAGE_KEY = 'tracklane.table-columns.v1';
const HIDDEN_BY_DEFAULT = new Set(['nextAction', 'notes']);

function DateCell({ value }) {
  const formatted = fmtDate(value);
  return formatted
    ? <span className="date-text">{formatted}</span>
    : <span className="empty-date">--</span>;
}

function loadVisibility() {
  const defaults = Object.fromEntries(OPTIONAL_COLUMNS.map((col) => [col.key, !HIDDEN_BY_DEFAULT.has(col.key)]));
  if (typeof window === 'undefined') return defaults;

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaults;
    const parsed = JSON.parse(raw);
    return { ...defaults, ...parsed };
  } catch {
    return defaults;
  }
}

function chipClassForSeason(season) {
  return `season-chip season-chip--${slug(season)}`;
}

function statusButtonLabel(status) {
  return `Advance status: ${status}`;
}

export default function ApplicationsTable({
  applications,
  onEdit,
  onDelete,
  onAdvanceStatus,
  activeFilterLabel,
  activeFilter,
  onFilterClear,
}) {
  const [sort, setSort] = useState({ col: 'applied', dir: -1 });
  const [visibleColumns, setVisibleColumns] = useState(loadVisibility);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(visibleColumns));
  }, [visibleColumns]);

  const toggleSort = (col) => {
    setSort((prev) => {
      if (prev.col !== col) return { col, dir: 1 };
      if (prev.dir === 1) return { col, dir: -1 };
      return { col: null, dir: 1 };
    });
  };

  const sorted = useMemo(() => {
    const rows = applications.map((row, index) => ({ row, index }));
    if (!sort.col) return rows;
    return rows.sort((a, b) => {
      const av = (a.row[sort.col] ?? '').toString().toLowerCase();
      const bv = (b.row[sort.col] ?? '').toString().toLowerCase();
      return av < bv ? -sort.dir : av > bv ? sort.dir : 0;
    });
  }, [applications, sort]);

  const visibleOptionalColumns = OPTIONAL_COLUMNS.filter((col) => visibleColumns[col.key]);
  const allColumns = [...BASE_COLUMNS, ...visibleOptionalColumns];
  const colSpan = allColumns.length + 2;
  const emptyCopy = getEmptyStateCopy(activeFilterLabel || activeFilter);

  const renderOptionalCell = (row, key) => {
    if (key === 'season') {
      return row.season
        ? <span className={chipClassForSeason(row.season)}>{row.season}</span>
        : <span className="season-empty">--</span>;
    }

    if (key === 'stack') {
      return row.stack ? <span className="stack-text">{row.stack}</span> : <span className="comp-empty">--</span>;
    }

    if (key === 'comp') {
      const suffix = COMP_PERIOD_SUFFIX[row.compPeriod] || COMP_PERIOD_SUFFIX.Hourly;
      return row.comp
        ? <span className="comp-text">${row.comp}{suffix}</span>
        : <span className="comp-empty">--</span>;
    }

    if (key === 'nextAction') {
      const deadline = getDeadlineState(row.nextActionDue);
      if (!row.nextAction && !deadline) return <span className="comp-empty">--</span>;
      const className = ['deadline-badge', deadline ? `deadline-${deadline.tone}` : 'deadline-neutral'].filter(Boolean).join(' ');
      return (
        <span className={className} title={deadline?.label || row.nextActionDue || ''}>
          {row.nextAction || deadline?.label || '--'}
        </span>
      );
    }

    if (key === 'updatedAt') {
      return row.updatedAt ? <span className="updated-stamp">{formatRelativeStamp(row.updatedAt)}</span> : <span className="comp-empty">--</span>;
    }

    if (key === 'notes') {
      return (
        <span className="notes-text" title={row.notes || ''}>
          {row.notes || '--'}
        </span>
      );
    }

    return null;
  };

  return (
    <div className="board-wrap">
      <div className="table-tools">
        <div className="table-tools__label">Columns</div>
        <div className="table-tools__group">
          {OPTIONAL_COLUMNS.map((col) => (
            <button
              key={col.key}
              type="button"
              className={`column-toggle${visibleColumns[col.key] ? ' active' : ''}`}
              aria-pressed={visibleColumns[col.key]}
              onClick={() => setVisibleColumns((prev) => ({ ...prev, [col.key]: !prev[col.key] }))}
            >
              {col.label}
            </button>
          ))}
        </div>
      </div>
      <table>
        <thead>
          <tr>
            {allColumns.map((c) => (
              <th
                key={c.key}
                className="sortable-th"
                aria-sort={sort.col === c.key ? (sort.dir === 1 ? 'ascending' : 'descending') : 'none'}
              >
                <button
                  type="button"
                  className="sortable-th__button"
                  onClick={() => toggleSort(c.key)}
                  title={`Sort by ${c.label}`}
                  aria-label={`Sort by ${c.label}`}
                >
                  {c.label}
                  <span className={sort.col === c.key ? 'sort-icon sort-icon--active' : 'sort-icon sort-icon--idle'}>
                    {sort.col === c.key ? (sort.dir === 1 ? '↑' : '↓') : '↕'}
                  </span>
                </button>
              </th>
            ))}
            <th></th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {sorted.length === 0 ? (
            <tr>
              <td colSpan={colSpan}>
                <div className="empty-state">
                  <span className="big">{emptyCopy.title}</span>
                  {emptyCopy.body}
                  {(activeFilterLabel || activeFilter) && onFilterClear && (
                    <button className="empty-state__action" type="button" onClick={onFilterClear}>
                      {emptyCopy.actionLabel}
                    </button>
                  )}
                </div>
              </td>
            </tr>
          ) : (
            sorted.map(({ row: r, index: originalIndex }) => {
              const deadline = getDeadlineState(r.nextActionDue);
              const rowClass = [
                `status-row--${slug(r.status)}`,
                deadline?.tone === 'overdue' ? 'status-row--overdue' : '',
              ].filter(Boolean).join(' ');

              return (
                <tr key={originalIndex} onClick={() => onEdit(originalIndex)} className={rowClass}>
                  <td>
                    <div className="company-cell">
                      <CompanyLogo name={r.company} />
                      <div>
                        <div className="company-name">{r.company}</div>
                        <div className="role-text">
                          {r.role}
                          {r.location ? ` · ${shortenLocation(r.location)}` : ''}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td>
                    {onAdvanceStatus ? (
                      <button
                        type="button"
                        className={`chip chip-${slug(r.status)} chip-action`}
                        aria-label={statusButtonLabel(r.status)}
                        onClick={(e) => {
                          e.stopPropagation();
                          onAdvanceStatus(originalIndex);
                        }}
                      >
                        {r.status}
                      </button>
                    ) : (
                      <span className={`chip chip-${slug(r.status)}`}>{r.status}</span>
                    )}
                  </td>
                  <td>
                    <DateCell value={r.applied} />
                  </td>
                  {visibleColumns.season && (
                    <td>
                      {r.season
                        ? <span className={chipClassForSeason(r.season)}>{r.season}</span>
                        : <span className="season-empty">--</span>}
                    </td>
                  )}
                  {visibleOptionalColumns.filter((col) => col.key !== 'season').map((col) => (
                    <td key={col.key}>
                      {renderOptionalCell(r, col.key)}
                    </td>
                  ))}
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
                        onDelete(originalIndex);
                      }}
                    >
                      &times;
                    </button>
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}
