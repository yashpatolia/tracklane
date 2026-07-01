import { useEffect, useMemo, useState } from 'react';
import { fetchApplications, saveApplications } from './api.js';
import Header from './components/Header.jsx';
import Pipeline, { REJECTED_SENTINEL } from './components/Pipeline.jsx';
import Stats from './components/Stats.jsx';
import ApplicationsTable from './components/ApplicationsTable.jsx';
import ApplicationModal from './components/ApplicationModal.jsx';

export default function App() {
  const [applications, setApplications] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [editingIndex, setEditingIndex] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState(null);

  useEffect(() => {
    fetchApplications()
      .then(setApplications)
      .catch((err) => {
        console.error(err);
        alert('Could not reach the API server. Run "npm run dev:server" (or "npm run dev" for both) and reload.');
      })
      .finally(() => setLoaded(true));
  }, []);

  const filteredApplications = useMemo(() => {
    if (!statusFilter) return applications;
    if (statusFilter === REJECTED_SENTINEL)
      return applications.filter((a) => a.status === 'Rejected' || a.status === 'Withdrawn');
    return applications.filter((a) => a.status === statusFilter);
  }, [applications, statusFilter]);

  const openAdd = () => { setEditingIndex(null); setModalOpen(true); };
  const openEdit = (index) => { setEditingIndex(index); setModalOpen(true); };
  const closeModal = () => setModalOpen(false);

  const persist = async (next) => {
    setApplications(next);
    await saveApplications(next);
  };

  const handleSave = async (entry) => {
    const next = [...applications];
    editingIndex !== null ? (next[editingIndex] = entry) : next.push(entry);
    await persist(next);
    closeModal();
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

  return (
    <>
      <Header />
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
          />
        )}
      </div>
      {modalOpen && (
        <ApplicationModal
          initialData={editingIndex !== null ? applications[editingIndex] : null}
          isEditing={editingIndex !== null}
          onSave={handleSave}
          onCancel={closeModal}
          onDelete={handleDeleteEditing}
        />
      )}
    </>
  );
}
