import { useEffect, useMemo, useRef, useState } from 'react';
import { fetchApplications, fetchMe, logout, saveApplications } from './api.js';
import Header from './components/Header.jsx';
import LoginPanel from './components/LoginPanel.jsx';
import FriendsView from './components/FriendsView.jsx';
import { REJECTED_SENTINEL } from './components/Pipeline.jsx';
import SettingsModal from './components/SettingsModal.jsx';
import Stats from './components/Stats.jsx';
import ApplicationsTable from './components/ApplicationsTable.jsx';
import ApplicationModal from './components/ApplicationModal.jsx';
import { advanceStatus } from './utils/applications.js';
import { applicationsToCsv, csvToApplications } from './utils/csv.js';

function localDayString(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export default function App({ initialUser = null, initialApplications = null }) {
  const [user, setUser] = useState(initialUser);
  const [authChecked, setAuthChecked] = useState(Boolean(initialUser));
  const [applications, setApplications] = useState(initialApplications ?? []);
  const [loaded, setLoaded] = useState(initialApplications !== null);
  const [editingIndex, setEditingIndex] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState(null);
  const [showArchived, setShowArchived] = useState(false);
  const [view, setView] = useState('applications');
  const importInputRef = useRef(null);

  useEffect(() => {
    if (initialUser) return;
    Promise.resolve(fetchMe())
      .then(setUser)
      .catch((err) => console.error(err))
      .finally(() => setAuthChecked(true));
  }, [initialUser]);

  useEffect(() => {
    if (!user) return;
    if (initialApplications !== null) return;
    Promise.resolve(fetchApplications())
      .then(setApplications)
      .catch((err) => {
        console.error(err);
        alert('Could not reach the API server. Run "npm run dev:server" (or "npm run dev" for both) and reload.');
      })
      .finally(() => setLoaded(true));
  }, [user, initialApplications]);

  useEffect(() => {
    const onKeyDown = (e) => {
      const target = e.target;
      const isTyping = target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName) || target?.isContentEditable;
      if (isTyping) return;
      if ((e.metaKey || e.ctrlKey) && e.altKey && e.code === 'KeyN') {
        e.preventDefault();
        setEditingIndex(null);
        setModalOpen(true);
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, []);

  const handleLogout = async () => {
    await logout();
    setUser(null);
    setApplications([]);
    setLoaded(false);
  };

  const activeApplications = useMemo(() => applications.filter((a) => !a.archived), [applications]);

  const filteredApplications = useMemo(() => {
    const source = showArchived ? applications : activeApplications;
    if (!statusFilter) return source;
    if (statusFilter === REJECTED_SENTINEL)
      return source.filter((a) => a.status === 'Rejected' || a.status === 'Withdrawn');
    return source.filter((a) => a.status === statusFilter);
  }, [applications, activeApplications, showArchived, statusFilter]);

  const activeFilterLabel = statusFilter === REJECTED_SENTINEL ? 'Rejected / Withdrawn' : statusFilter;

  const openAdd = () => { setEditingIndex(null); setModalOpen(true); };
  const openEdit = (index) => { setEditingIndex(index); setModalOpen(true); };
  const closeModal = () => setModalOpen(false);
  const handleUsernameSet = (username) => setUser((current) => ({ ...current, username }));

  const persist = async (next) => {
    setApplications(next);
    await saveApplications(next);
  };

  const handleSave = async (entry) => {
    const stamped = { ...entry, updatedAt: new Date().toISOString() };
    const next = [...applications];
    editingIndex !== null ? (next[editingIndex] = stamped) : next.push(stamped);
    await persist(next);
    closeModal();
  };

  const handleAdvanceStatus = async (index) => {
    const app = filteredApplications[index];
    const realIndex = applications.indexOf(app);
    if (realIndex === -1) return;

    const current = applications[realIndex];
    const nextStatus = advanceStatus(current.status);
    if (nextStatus === current.status) return;

    const next = [...applications];
    next[realIndex] = {
      ...current,
      status: nextStatus,
      applied: current.applied || localDayString(),
      updatedAt: new Date().toISOString(),
    };
    await persist(next);
  };

  const handleDeleteEditing = async () => {
    if (editingIndex === null) return;
    if (!confirm(`Delete ${applications[editingIndex].company}?`)) return;
    const next = applications.filter((_, i) => i !== editingIndex);
    await persist(next);
    closeModal();
  };

  const handleQuickDelete = async (index) => {
    const app = filteredApplications[index];
    const realIndex = applications.indexOf(app);
    if (!confirm(`Delete ${app.company}?`)) return;
    const next = applications.filter((_, i) => i !== realIndex);
    await persist(next);
  };

  const handleToggleArchive = async (index) => {
    const app = filteredApplications[index];
    const realIndex = applications.indexOf(app);
    if (realIndex === -1) return;

    const current = applications[realIndex];
    const next = [...applications];
    next[realIndex] = { ...current, archived: !current.archived, updatedAt: new Date().toISOString() };
    await persist(next);
  };

  const handleEdit = (index) => {
    const app = filteredApplications[index];
    const realIndex = applications.indexOf(app);
    openEdit(realIndex);
  };

  const handleExport = () => {
    const csv = applicationsToCsv(applications);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `tracklane-applications-${localDayString()}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleImportClick = () => importInputRef.current?.click();

  const handleImportFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    const text = await file.text();
    const imported = csvToApplications(text);
    if (imported.length === 0) {
      alert('No rows found in that CSV.');
      return;
    }
    if (!confirm(`Import ${imported.length} application${imported.length === 1 ? '' : 's'}? They will be added to your existing board.`)) return;

    const stamped = imported.map((entry) => ({ ...entry, updatedAt: entry.updatedAt || new Date().toISOString() }));
    await persist([...applications, ...stamped]);
  };

  if (!authChecked) return null;
  if (!user) return <LoginPanel />;

  return (
    <div className="app-shell">
      <Header
        user={user}
        onLogout={handleLogout}
        onOpenSettings={() => setSettingsOpen(true)}
        applications={activeApplications}
        activeFilter={statusFilter}
        onFilterChange={setStatusFilter}
        view={view}
        onViewChange={setView}
      />

      <div className="page">
        {view === 'applications' && (
          <main className="main">
            <Stats applications={activeApplications} />
            <div className="toolbar">
              <h2>
                Applications
                {statusFilter && <span className="filter-badge">{statusFilter === REJECTED_SENTINEL ? 'Rejected / Withdrawn' : statusFilter}</span>}
              </h2>
              <div className="toolbar__actions">
                <button
                  className={`btn-secondary${showArchived ? ' active' : ''}`}
                  aria-pressed={showArchived}
                  onClick={() => setShowArchived((v) => !v)}
                >
                  {showArchived ? 'Hide Archived' : 'Show Archived'}
                </button>
                <button className="btn-secondary" onClick={handleExport}>
                  Export CSV
                </button>
                <button className="btn-secondary" onClick={handleImportClick}>
                  Import CSV
                </button>
                <input
                  ref={importInputRef}
                  type="file"
                  accept=".csv,text/csv"
                  onChange={handleImportFile}
                  style={{ display: 'none' }}
                />
                <button className="btn-add" onClick={openAdd}>
                  + New Entry
                </button>
              </div>
            </div>
            {loaded && (
              <ApplicationsTable
                applications={filteredApplications}
                onEdit={handleEdit}
                onDelete={handleQuickDelete}
                onAdvanceStatus={handleAdvanceStatus}
                onArchive={handleToggleArchive}
                activeFilterLabel={activeFilterLabel}
                onFilterClear={() => setStatusFilter(null)}
              />
            )}
          </main>
        )}
        {view === 'friends' && (
          !user.username ? (
            <main className="main">
              <section className="username-gate" aria-label="Username required for friends">
                <span>Set your username to find friends and send friend requests.</span>
                <button type="button" className="btn-add" onClick={() => setSettingsOpen(true)}>
                  Set username
                </button>
              </section>
            </main>
          ) : (
            <FriendsView />
          )
        )}
      </div>
      {modalOpen && (
        <ApplicationModal
          initialData={editingIndex !== null ? applications[editingIndex] : null}
          isEditing={editingIndex !== null}
          existingApplications={applications}
          editingIndex={editingIndex}
          onSave={handleSave}
          onCancel={closeModal}
          onDelete={handleDeleteEditing}
        />
      )}
      {settingsOpen && (
        <SettingsModal
          user={user}
          onClose={() => setSettingsOpen(false)}
          onUsernameSet={handleUsernameSet}
        />
      )}
    </div>
  );
}
