const ACTION_LABEL = {
  none: 'Add',
  pending_sent: 'Pending',
  pending_received: 'Respond in Requests',
  friends: 'Friends',
};

export default function FriendSearchResults({ results, onSendRequest }) {
  if (results.length === 0) return null;

  return (
    <div className="friend-list">
      {results.map((r) => (
        <div key={r.id} className="friend-row">
          <div className="friend-row__identity">
            <span className="friend-row__name">{r.name || r.username}</span>
            <span className="friend-row__handle">@{r.username}</span>
          </div>
          <button
            type="button"
            className={r.friendshipStatus === 'none' ? 'btn-add' : 'btn-secondary'}
            disabled={r.friendshipStatus !== 'none'}
            onClick={() => onSendRequest(r.id)}
          >
            {ACTION_LABEL[r.friendshipStatus]}
          </button>
        </div>
      ))}
    </div>
  );
}
