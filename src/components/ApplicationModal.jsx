import { useEffect, useRef, useState } from 'react';
import { EMPTY_ENTRY, STATUS_OPTIONS } from '../constants.js';

export default function ApplicationModal({ initialData, isEditing, onSave, onCancel, onDelete }) {
  const [form, setForm] = useState(initialData || EMPTY_ENTRY);
  const companyRef = useRef(null);

  useEffect(() => {
    companyRef.current?.focus();
  }, []);

  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === 'Escape') onCancel();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onCancel]);

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleSave = () => {
    const entry = { ...form, company: form.company.trim() };
    if (!entry.company) {
      alert('Company name is required.');
      return;
    }
    onSave(entry);
  };

  return (
    <div
      className="modal-overlay active"
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <div className="modal">
        <h3>{isEditing ? 'Edit Application' : 'Add Application'}</h3>
        <div className="form-grid">
          <div className="form-group">
            <label>Company</label>
            <input ref={companyRef} type="text" placeholder="e.g. Shopify" value={form.company} onChange={set('company')} />
          </div>
          <div className="form-group">
            <label>Role</label>
            <input type="text" placeholder="e.g. Software Engineer Intern" value={form.role} onChange={set('role')} />
          </div>
          <div className="form-group">
            <label>Location</label>
            <input type="text" placeholder="e.g. Toronto (Hybrid)" value={form.location} onChange={set('location')} />
          </div>
          <div className="form-group">
            <label>Stack</label>
            <input type="text" placeholder="e.g. Go/React/TypeScript" value={form.stack} onChange={set('stack')} />
          </div>
          <div className="form-group">
            <label>Status</label>
            <select value={form.status} onChange={set('status')}>
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>Applied Date</label>
            <input type="date" value={form.applied} onChange={set('applied')} />
          </div>
          <div className="form-group">
            <label>OA Date</label>
            <input type="date" value={form.oa} onChange={set('oa')} />
          </div>
          <div className="form-group">
            <label>Interview Date</label>
            <input type="date" value={form.interview} onChange={set('interview')} />
          </div>
          <div className="form-group">
            <label>Offer Date</label>
            <input type="date" value={form.offer} onChange={set('offer')} />
          </div>
          <div className="form-group">
            <label>Comp ($/hr CAD)</label>
            <input type="text" placeholder="e.g. 32" value={form.comp} onChange={set('comp')} />
          </div>
          <div className="form-group full">
            <label>Platform</label>
            <input type="text" placeholder="e.g. LinkedIn, Company Site, Co-op Portal" value={form.platform} onChange={set('platform')} />
          </div>
          <div className="form-group full">
            <label>
              Application Status Link{' '}
              <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0, color: 'var(--text-dim)' }}>
                (optional: Workday, Greenhouse, etc.)
              </span>
            </label>
            <input type="url" placeholder="https://wd3.myworkdayjobs.com/..." value={form.link} onChange={set('link')} />
          </div>
          <div className="form-group full">
            <label>Notes</label>
            <textarea placeholder="Referral? Recruiter name? Stack details? Anything relevant..." value={form.notes} onChange={set('notes')} />
          </div>
        </div>
        <div className="modal-actions">
          {isEditing && (
            <button className="btn-delete" onClick={onDelete}>
              Delete
            </button>
          )}
          <button className="btn-cancel" onClick={onCancel}>
            Cancel
          </button>
          <button className="btn-save" onClick={handleSave}>
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
