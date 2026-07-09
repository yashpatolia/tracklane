import ThemeToggle from './ThemeToggle.jsx';
import Pipeline from './Pipeline.jsx';

const VIEWS = [
  { id: 'applications', label: 'Applications' },
  { id: 'friends', label: 'Friends' },
];

export default function Header({ user, onLogout, applications, activeFilter, onFilterChange, view, onViewChange, onOpenSettings }) {
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
            {VIEWS.map((v) => (
              <button
                key={v.id}
                type="button"
                className={`topnav__link${view === v.id ? ' active' : ''}`}
                aria-pressed={view === v.id}
                onClick={() => onViewChange(v.id)}
              >
                {v.label}
              </button>
            ))}
          </nav>
        </div>
        <div className="topnav__right">
          <ThemeToggle />
          <button className="app-meta app-meta--button" title={user?.email} onClick={onOpenSettings}>
            {user?.name || user?.email}
          </button>
          <button className="btn-logout" onClick={onLogout}>
            Sign out
          </button>
        </div>
      </div>
      <div className="topnav__route">
        <Pipeline
          applications={applications}
          activeFilter={activeFilter}
          onFilterChange={onFilterChange}
          compact
        />
      </div>
    </header>
  );
}
