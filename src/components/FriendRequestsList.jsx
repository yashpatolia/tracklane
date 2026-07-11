import { acceptFriendRequest, cancelFriendRequest, declineFriendRequest } from '../friends-api.js';
import { useState } from 'react';

export default function FriendRequestsList({ incoming, outgoing, onChanged }) {
  const [error, setError] = useState('');

  const run = async (action) => {
    setError('');
    try {
      await action();
      onChanged();
    } catch (err) {
      setError(err.message);
    }
  };

  const accept = async (id) => {
    await run(() => acceptFriendRequest(id));
  };

  const decline = async (id) => {
    await run(() => declineFriendRequest(id));
  };

  const cancel = async (id) => {
    await run(() => cancelFriendRequest(id));
  };

  return (
    <section className="friend-card friend-card--split">
      {error && <p className="friend-message friend-message--error" role="alert">{error}</p>}
      <div>
        <span className="form-section__title">Incoming requests</span>
        {incoming.length === 0 && <p className="friend-empty">No incoming requests.</p>}
        {incoming.map((request) => (
          <div className="friend-row" key={request.id}>
            <span>@{request.username}</span>
            <div className="friend-row__actions">
              <button type="button" className="btn-secondary" onClick={() => accept(request.id)}>
                Accept
              </button>
              <button type="button" className="btn-secondary" onClick={() => decline(request.id)}>
                Decline
              </button>
            </div>
          </div>
        ))}
      </div>

      <div>
        <span className="form-section__title">Sent requests</span>
        {outgoing.length === 0 && <p className="friend-empty">No sent requests.</p>}
        {outgoing.map((request) => (
          <div className="friend-row" key={request.id}>
            <span>@{request.username}</span>
            <button type="button" className="btn-secondary" onClick={() => cancel(request.id)}>
              Cancel
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}
