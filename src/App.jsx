import { useEffect, useMemo, useState } from 'react';
import { fetchApplications, fetchMe, logout, saveApplications } from './api.js';
import Header from './components/Header.jsx';
import LoginPanel from './components/LoginPanel.jsx';
import Pipeline, { REJECTED_SENTINEL } from './components/Pipeline.jsx';
import Stats from './components/Stats.jsx';
import ApplicationsTable from './components/ApplicationsTable.jsx';
import ApplicationModal from './components/ApplicationModal.jsx';
import { advanceStatus } from './utils/applications.js';

export default function App({ initialUser = null, initialApplications = null }) {
  const [user, setUser] = useState(initialUser);
  const [authChecked, setAuthChecked] = useState(Boolean(initialUser));
  const [applications, setApplications] = useState(initialApplications ?? []);
  const [loaded, setLoaded] = useState(initialApplications !== null);
  const [editingIndex, setEditingIndex] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState(null);

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
      if ((e.metaKey || e.ctrlKey) && e.altKey && e.key.toLowerCase() === 'n') {
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

  const filteredApplications = useMemo(() => {
    if (!statusFilter) return applications;
    if (statusFilter === REJECTED_SENTINEL)
      return applications.filter((a) => a.status === 'Rejected' || a.status === 'Withdrawn');
    return applications.filter((a) => a.status === statusFilter);
  }, [applications, statusFilter]);

  const activeFilterLabel = statusFilter === REJECTED_SENTINEL ? 'Rejected / Withdrawn' : statusFilter;

  const openAdd = () => { setEditingIndex(null); setModalOpen(true); };
  const openEdit = (index) => { setEditingIndex(index); setModalOpen(true); };
  const closeModal = () => setModalOpen(false);

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
      applied: current.applied || new Date().toISOString().slice(0, 10),
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

  const handleEdit = (index) => {
    const app = filteredApplications[index];
    const realIndex = applications.indexOf(app);
    openEdit(realIndex);
  };

  if (!authChecked) return null;
  if (!user) return <LoginPanel />;

  return (
    <>
      <Header user={user} onLogout={handleLogout} />
      <Stats applications={applications} />
      <Pipeline
        applications={applications}
        activeFilter={statusFilter}
        onFilterChange={setStatusFilter}
      />
      <div className="main">
        <div className="toolbar">
          <h2>
            Applications
            {statusFilter && <span className="filter-badge">{statusFilter === REJECTED_SENTINEL ? 'Rejected / Withdrawn' : statusFilter}</span>}
          </h2>
          <button className="btn-add" onClick={openAdd}>
            + New Entry
          </button>
        </div>
        {loaded && (
          <ApplicationsTable
            applications={filteredApplications}
            onEdit={handleEdit}
            onDelete={handleQuickDelete}
            onAdvanceStatus={handleAdvanceStatus}
            activeFilterLabel={activeFilterLabel}
            onFilterClear={() => setStatusFilter(null)}
          />
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
    </>
  );
}
