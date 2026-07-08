import { useEffect, useId, useRef, useState } from 'react';
import { COMP_PERIOD_OPTIONS, EMPTY_ENTRY, SEASON_OPTIONS, STATUS_OPTIONS } from '../constants.js';
import { validateApplication } from '../utils/applications.js';
import { fetchJobPosting } from '../api.js';

export default function ApplicationModal({ initialData, isEditing, existingApplications = [], editingIndex = null, onSave, onCancel, onDelete }) {
  const [form, setForm] = useState(initialData || EMPTY_ENTRY);
  const [error, setError] = useState('');
  const [fetchState, setFetchState] = useState({ status: 'idle', message: '' });
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
    setFetchState({ status: 'idle', message: '' });
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

  const handleFetchDetails = async () => {
    if (!form.link || fetchState.status === 'loading') return;
    setFetchState({ status: 'loading', message: '' });
    try {
      const data = await fetchJobPosting(form.link);
      setForm((f) => ({
        ...f,
        company: f.company || data.company || f.company,
        role: f.role || data.role || f.role,
        location: f.location || data.location || f.location,
        season: f.season || data.season || f.season,
        stack: f.stack || data.stack || f.stack,
        comp: f.comp || data.comp || f.comp,
        compPeriod: data.compPeriod || f.compPeriod,
        platform: f.platform || data.platform || f.platform,
      }));
      setFetchState(
        data.ok
          ? { status: 'success', message: 'Filled in from the posting, double-check before saving.' }
          : { status: 'empty', message: 'Could not find job details on that page. Fill in manually.' }
      );
    } catch (err) {
      setFetchState({ status: 'error', message: err.message });
    }
  };

  return (
    <div
      className="modal-overlay active"
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <div className="modal">
        <div className="modal-header">
          <div>
            <span className="modal-eyebrow">{isEditing ? 'Edit entry' : 'New entry'}</span>
            <h3>{isEditing ? 'Edit Application' : 'Add Application'}</h3>
          </div>
          <button type="button" className="modal-close" onClick={onCancel} aria-label="Close">
            &times;
          </button>
        </div>
        {error && <div className="form-error" role="alert">{error}</div>}

        <div className="form-callout">
          <div className="form-callout__head">
            <label htmlFor={linkId}>Job posting link</label>
            <span className="form-callout__tag">Auto-fill</span>
          </div>
          <div className="link-fetch-row">
            <input id={linkId} type="url" placeholder="https://boards.greenhouse.io/..." value={form.link} onChange={set('link')} />
            <button
              type="button"
              className="btn-fetch"
              onClick={handleFetchDetails}
              disabled={!form.link || fetchState.status === 'loading'}
            >
              {fetchState.status === 'loading' ? 'Fetching…' : 'Fetch details'}
            </button>
          </div>
          <p className="form-callout__hint">Paste the posting and fetch to pull in the company, role, location, and pay.</p>
          {fetchState.message && (
            <p className={`fetch-hint fetch-hint--${fetchState.status}`}>{fetchState.message}</p>
          )}
        </div>

        <div className="form-section">
          <span className="form-section__title">Role details</span>
          <div className="form-grid form-grid--quad">
            <div className="form-group">
              <label htmlFor={companyId}>Company</label>
              <input id={companyId} ref={companyRef} type="text" placeholder="e.g. Shopify" value={form.company} onChange={set('company')} />
            </div>
            <div className="form-group">
              <label htmlFor={roleId}>Role</label>
              <input id={roleId} type="text" placeholder="e.g. Software Engineer Intern" value={form.role} onChange={set('role')} />
            </div>
            <div className="form-group">
              <label htmlFor={locationId}>Location</label>
              <input id={locationId} type="text" placeholder="e.g. Toronto (Hybrid)" value={form.location} onChange={set('location')} />
            </div>
            <div className="form-group">
              <label htmlFor={stackId}>Stack</label>
              <input id={stackId} type="text" placeholder="e.g. Go/React/TypeScript" value={form.stack} onChange={set('stack')} />
            </div>
            <div className="form-group full">
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
          </div>
        </div>

        <div className="form-section">
          <span className="form-section__title">Status &amp; timeline</span>
          <div className="form-grid">
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
              <label htmlFor={nextActionId}>Next action</label>
              <input id={nextActionId} type="text" placeholder="e.g. Follow up with recruiter" value={form.nextAction} onChange={set('nextAction')} />
            </div>
            <div className="form-group full">
              <label htmlFor={nextActionDueId}>Next action due</label>
              <input id={nextActionDueId} type="date" value={form.nextActionDue} onChange={set('nextActionDue')} />
            </div>
          </div>
        </div>

        <div className="form-section">
          <span className="form-section__title">Compensation &amp; notes</span>
          <div className="form-grid form-grid--pair">
            <div className="form-group">
              <label htmlFor={compId}>Compensation</label>
              <div className="comp-row">
                <input id={compId} type="text" placeholder="e.g. 32" value={form.comp} onChange={set('comp')} />
                <select value={form.compPeriod || 'Hourly'} onChange={set('compPeriod')} aria-label="Pay period">
                  {COMP_PERIOD_OPTIONS.map((period) => (
                    <option key={period} value={period}>
                      {period}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="form-group">
              <label htmlFor={platformId}>Platform</label>
              <input id={platformId} type="text" placeholder="e.g. LinkedIn, Company Site, Co-op Portal" value={form.platform} onChange={set('platform')} />
            </div>
            <div className="form-group full">
              <label htmlFor={notesId}>Notes</label>
              <textarea id={notesId} placeholder="Referral? Recruiter name? Stack details? Anything relevant..." value={form.notes} onChange={set('notes')} />
            </div>
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
