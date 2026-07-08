import ThemeToggle from './ThemeToggle.jsx';
import Pipeline from './Pipeline.jsx';

const NAV_LINKS = [
  { href: '#applications', label: 'Applications' },
];

export default function Header({ user, onLogout, applications, activeFilter, onFilterChange }) {
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
              <a key={link.href} className="topnav__link" href={link.href}>
                {link.label}
              </a>
            ))}
          </nav>
        </div>
        <div className="topnav__right">
          <ThemeToggle />
          <span className="app-meta" title={user?.email}>{user?.name || user?.email}</span>
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
