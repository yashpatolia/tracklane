import { useEffect, useId, useState } from 'react';
import { claimUsername } from '../friends-api.js';

const USERNAME_PATTERN = /^[a-z0-9_]{3,20}$/;

export default function SettingsModal({ user, onClose, onUsernameSet }) {
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const usernameId = useId();

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  const normalized = username.trim().toLowerCase();
  const hasUsername = Boolean(user?.username);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (hasUsername) return;
    if (!USERNAME_PATTERN.test(normalized)) {
      setError('Username must be 3-20 characters and contain only lowercase letters, numbers, or underscores.');
      return;
    }

    setSaving(true);
    setError('');
    try {
      const result = await claimUsername(normalized);
      onUsernameSet(result.username);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="modal-overlay active"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <form className="modal modal--narrow" onSubmit={handleSubmit}>
        <div className="modal-header">
          <div>
            <span className="modal-eyebrow">Account</span>
            <h3>Settings</h3>
          </div>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Close">
            &times;
          </button>
        </div>

        {error && <div className="form-error" role="alert">{error}</div>}

        <div className="form-section">
          <span className="form-section__title">Username</span>
          {hasUsername ? (
            <div className="username-lock">
              <span className="username-lock__value">@{user.username}</span>
              <p>Usernames are permanent once set.</p>
            </div>
          ) : (
            <div className="form-group">
              <label htmlFor={usernameId}>Choose username</label>
              <input
                id={usernameId}
                type="text"
                value={username}
                onChange={(event) => setUsername(event.target.value.toLowerCase())}
                placeholder="e.g. alex_2026"
                autoFocus
              />
              <p className="form-help">3-20 characters: lowercase letters, numbers, and underscores.</p>
            </div>
          )}
        </div>

        <div className="modal-actions">
          <button type="button" className="btn-cancel" onClick={onClose}>
            Close
          </button>
          {!hasUsername && (
            <button type="submit" className="btn-save" disabled={saving}>
              {saving ? 'Saving...' : 'Save username'}
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
