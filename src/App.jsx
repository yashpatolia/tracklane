import { useEffect, useState } from 'react';
import { fetchApplications, saveApplications } from './api.js';
import Header from './components/Header.jsx';
import Ticker from './components/Ticker.jsx';
import Stats from './components/Stats.jsx';
import ApplicationsTable from './components/ApplicationsTable.jsx';
import ApplicationModal from './components/ApplicationModal.jsx';

export default function App() {
  const [applications, setApplications] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [editingIndex, setEditingIndex] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    fetchApplications()
      .then(setApplications)
      .catch((err) => {
        console.error(err);
        alert('Could not reach the API server. Run "npm run dev:server" (or "npm run dev" for both) and reload.');
      })
      .finally(() => setLoaded(true));
  }, []);

  const openAdd = () => {
    setEditingIndex(null);
    setModalOpen(true);
  };

  const openEdit = (index) => {
    setEditingIndex(index);
    setModalOpen(true);
  };

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
    if (!confirm(`Delete ${applications[index].company}?`)) return;
    const next = applications.filter((_, i) => i !== index);
    await persist(next);
  };

  return (
    <>
      <Header />
      <Ticker applications={applications} />
      <Stats applications={applications} />
      <div className="main">
        <div className="toolbar">
          <h2>Applications</h2>
          <button className="btn-add" onClick={openAdd}>
            + New Entry
          </button>
        </div>
        {loaded && <ApplicationsTable applications={applications} onEdit={openEdit} onDelete={handleQuickDelete} />}
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
