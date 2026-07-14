import ThemeToggle from './ThemeToggle.jsx';
import Pipeline from './Pipeline.jsx';

const NAV_LINKS = [
  { view: 'applications', label: 'Applications' },
  { view: 'friends', label: 'Friends' },
];

export default function Header({ user, onLogout, onOpenSettings, applications, activeFilter, onFilterChange, view, onViewChange }) {
  return (
    <header className="topnav">
      <div className="topnav__row">
        <div className="topnav__left">
          <div className="topnav__brand">
            <div className="live-dot">
              <span className="live-dot__ring" />
              <span className="live-dot__core" />
            </div>
            <h1 className="app-title">Tracklane</h1>
          </div>
          <nav className="topnav__links" aria-label="Sections">
            {NAV_LINKS.map((link) => (
              <button
                key={link.view}
                type="button"
                className="topnav__link"
                aria-current={view === link.view ? 'page' : undefined}
                onClick={() => onViewChange(link.view)}
              >
                {link.label}
              </button>
            ))}
          </nav>
        </div>
        <div className="topnav__right">
          <ThemeToggle />
          <span className="app-meta" title={user?.email}>{user?.name || user?.email}</span>
          <button className="btn-logout" onClick={onOpenSettings}>
            Settings
          </button>
          <button className="btn-logout" onClick={onLogout}>
            Sign out
          </button>
        </div>
      </div>
      {view === 'applications' && (
        <div className="topnav__route">
          <Pipeline
            applications={applications}
            activeFilter={activeFilter}
            onFilterChange={onFilterChange}
            compact
          />
        </div>
      )}
    </header>
  );
}
