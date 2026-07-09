export default function FriendRequestsList({ incoming, outgoing, onAccept, onDecline, onCancel }) {
  if (incoming.length === 0 && outgoing.length === 0) {
    return (
      <div className="empty-state">
        <span className="big">No pending requests</span>
        Search for a handle above to send a friend request.
      </div>
    );
  }

  return (
    <div className="friend-requests">
      {incoming.length > 0 && (
        <div className="friend-requests__group">
          <span className="form-section__title">Incoming</span>
          <div className="friend-list">
            {incoming.map((r) => (
              <div key={r.id} className="friend-row">
                <div className="friend-row__identity">
                  <span className="friend-row__name">{r.user.name || r.user.username}</span>
                  <span className="friend-row__handle">@{r.user.username}</span>
                </div>
                <div className="friend-row__actions">
                  <button type="button" className="btn-add" onClick={() => onAccept(r.id)}>
                    Accept
                  </button>
                  <button type="button" className="btn-secondary" onClick={() => onDecline(r.id)}>
                    Decline
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      {outgoing.length > 0 && (
        <div className="friend-requests__group">
          <span className="form-section__title">Sent</span>
          <div className="friend-list">
            {outgoing.map((r) => (
              <div key={r.id} className="friend-row">
                <div className="friend-row__identity">
                  <span className="friend-row__name">{r.user.name || r.user.username}</span>
                  <span className="friend-row__handle">@{r.user.username}</span>
                </div>
                <button type="button" className="btn-secondary" onClick={() => onCancel(r.id)}>
                  Cancel
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
