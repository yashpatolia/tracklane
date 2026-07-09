import { useEffect, useId, useState } from 'react';
import { checkUsername, setUsername as saveUsername } from '../friends-api.js';

export default function SettingsModal({ user, onSave, onCancel }) {
  const [value, setValue] = useState(user?.username || '');
  const [check, setCheck] = useState({ status: 'idle', reason: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const usernameId = useId();

  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === 'Escape') onCancel();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onCancel]);

  useEffect(() => {
    if (!value || value === user?.username) {
      setCheck({ status: 'idle', reason: '' });
      return;
    }
    setCheck({ status: 'checking', reason: '' });
    const timer = setTimeout(async () => {
      try {
        const result = await checkUsername(value);
        setCheck({ status: result.available ? 'available' : 'taken', reason: result.reason || '' });
      } catch (err) {
        setCheck({ status: 'error', reason: err.message });
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [value, user?.username]);

  const canSave = value && value !== user?.username && check.status === 'available' && !saving;

  const handleSave = async () => {
    if (!canSave) return;
    setSaving(true);
    setError('');
    try {
      const result = await saveUsername(value);
      onSave(result.username);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
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
            <span className="modal-eyebrow">Account</span>
            <h3>Settings</h3>
          </div>
          <button type="button" className="modal-close" onClick={onCancel} aria-label="Close">
            &times;
          </button>
        </div>
        {error && <div className="form-error" role="alert">{error}</div>}

        <div className="form-section">
          <span className="form-section__title">Username</span>
          <div className="form-grid">
            <div className="form-group full">
              <label htmlFor={usernameId}>Handle</label>
              <input
                id={usernameId}
                type="text"
                placeholder="e.g. jsmith"
                value={value}
                onChange={(e) => setValue(e.target.value.toLowerCase())}
                autoFocus
              />
              {check.status === 'checking' && <p className="fetch-hint">Checking availability…</p>}
              {check.status === 'available' && <p className="fetch-hint fetch-hint--success">Available.</p>}
              {check.status === 'taken' && <p className="fetch-hint fetch-hint--error">{check.reason}</p>}
              {check.status === 'error' && <p className="fetch-hint fetch-hint--error">{check.reason}</p>}
            </div>
          </div>
          <p className="form-callout__hint">
            Friends will find you by this handle. 3-20 characters: lowercase letters, numbers, and underscores.
          </p>
        </div>

        <div className="modal-actions">
          <button className="btn-cancel" onClick={onCancel}>
            Cancel
          </button>
          <button className="btn-save" onClick={handleSave} disabled={!canSave}>
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}
