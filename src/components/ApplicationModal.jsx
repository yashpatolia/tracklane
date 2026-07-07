import { useEffect, useId, useRef, useState } from 'react';
import { EMPTY_ENTRY, SEASON_OPTIONS, STATUS_OPTIONS } from '../constants.js';
import { validateApplication } from '../utils/applications.js';

export default function ApplicationModal({ initialData, isEditing, existingApplications = [], editingIndex = null, onSave, onCancel, onDelete }) {
  const [form, setForm] = useState(initialData || EMPTY_ENTRY);
  const [error, setError] = useState('');
  const companyRef = useRef(null);
  const companyId = useId();
  const roleId = useId();
  const seasonId = useId();
  const locationId = useId();
  const stackId = useId();
  const statusId = useId();
  const appliedId = useId();
  const oaId = useId();
  const interviewId = useId();
  const offerId = useId();
  const compId = useId();
  const nextActionId = useId();
  const nextActionDueId = useId();
  const platformId = useId();
  const linkId = useId();
  const notesId = useId();

  useEffect(() => {
    companyRef.current?.focus();
  }, []);

  useEffect(() => {
    setForm(initialData || EMPTY_ENTRY);
    setError('');
  }, [initialData]);

  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === 'Escape') onCancel();
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault();
        handleSave();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onCancel, onSave, form, existingApplications, editingIndex]);

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));
  const setSeason = (season) => setForm((f) => ({ ...f, season }));
  const localDayString = () => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  };

  const handleSave = () => {
    const entry = {
      ...form,
      company: form.company.trim(),
      role: form.role.trim(),
      applied: form.status !== 'Not Applied' && !form.applied ? localDayString() : form.applied,
    };
    const result = validateApplication(entry, existingApplications, editingIndex);
    if (!result.ok) {
      setError(result.errors[0]);
      alert(result.errors[0]);
      return;
    }
    setError('');
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
        {error && <div className="form-error" role="alert">{error}</div>}
        <div className="form-grid">
          <div className="form-group">
            <label htmlFor={companyId}>Company</label>
            <input id={companyId} ref={companyRef} type="text" placeholder="e.g. Shopify" value={form.company} onChange={set('company')} />
          </div>
          <div className="form-group">
            <label htmlFor={roleId}>Role</label>
            <input id={roleId} type="text" placeholder="e.g. Software Engineer Intern" value={form.role} onChange={set('role')} />
          </div>
          <div className="form-group">
            <span id={seasonId} className="form-group__label">Season</span>
            <div className="season-bar" role="group" aria-labelledby={seasonId}>
              {SEASON_OPTIONS.map((season) => (
                <button
                  key={season}
                  type="button"
                  className={`season-pill${form.season === season ? ' active' : ''}`}
                  aria-pressed={form.season === season}
                  onClick={() => setSeason(season)}
                >
                  {season}
                </button>
              ))}
            </div>
          </div>
          <div className="form-group">
            <label htmlFor={locationId}>Location</label>
            <input id={locationId} type="text" placeholder="e.g. Toronto (Hybrid)" value={form.location} onChange={set('location')} />
          </div>
          <div className="form-group">
            <label htmlFor={stackId}>Stack</label>
            <input id={stackId} type="text" placeholder="e.g. Go/React/TypeScript" value={form.stack} onChange={set('stack')} />
          </div>
          <div className="form-group">
            <label htmlFor={statusId}>Status</label>
            <select id={statusId} value={form.status} onChange={set('status')}>
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label htmlFor={appliedId}>Applied Date</label>
            <input id={appliedId} type="date" value={form.applied} onChange={set('applied')} />
          </div>
          <div className="form-group">
            <label htmlFor={oaId}>OA Date</label>
            <input id={oaId} type="date" value={form.oa} onChange={set('oa')} />
          </div>
          <div className="form-group">
            <label htmlFor={interviewId}>Interview Date</label>
            <input id={interviewId} type="date" value={form.interview} onChange={set('interview')} />
          </div>
          <div className="form-group">
            <label htmlFor={offerId}>Offer Date</label>
            <input id={offerId} type="date" value={form.offer} onChange={set('offer')} />
          </div>
          <div className="form-group">
            <label htmlFor={compId}>Comp ($/hr CAD)</label>
            <input id={compId} type="text" placeholder="e.g. 32" value={form.comp} onChange={set('comp')} />
          </div>
          <div className="form-group">
            <label htmlFor={nextActionId}>Next action</label>
            <input id={nextActionId} type="text" placeholder="e.g. Follow up with recruiter" value={form.nextAction} onChange={set('nextAction')} />
          </div>
          <div className="form-group">
            <label htmlFor={nextActionDueId}>Next action due</label>
            <input id={nextActionDueId} type="date" value={form.nextActionDue} onChange={set('nextActionDue')} />
          </div>
          <div className="form-group full">
            <label htmlFor={platformId}>Platform</label>
            <input id={platformId} type="text" placeholder="e.g. LinkedIn, Company Site, Co-op Portal" value={form.platform} onChange={set('platform')} />
          </div>
          <div className="form-group full">
            <label>
              Application Status Link{' '}
              <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0, color: 'var(--text-dim)' }}>
                (optional: Workday, Greenhouse, etc.)
              </span>
            </label>
            <input id={linkId} type="url" placeholder="https://wd3.myworkdayjobs.com/..." value={form.link} onChange={set('link')} />
          </div>
          <div className="form-group full">
            <label htmlFor={notesId}>Notes</label>
            <textarea id={notesId} placeholder="Referral? Recruiter name? Stack details? Anything relevant..." value={form.notes} onChange={set('notes')} />
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
