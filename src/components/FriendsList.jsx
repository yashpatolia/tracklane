export default function FriendsList({ friends, onRemove }) {
  if (friends.length === 0) {
    return (
      <div className="empty-state">
        <span className="big">No friends yet</span>
        Search for a handle above and send a request to get started.
      </div>
    );
  }

  return (
    <div className="friend-list">
      {friends.map((f) => (
        <div key={f.id} className="friend-row">
          <div className="friend-row__identity">
            <span className="friend-row__name">{f.user.name || f.user.username}</span>
            <span className="friend-row__handle">@{f.user.username}</span>
          </div>
          <button
            type="button"
            className="row-del"
            title="Remove friend"
            onClick={() => {
              if (confirm(`Remove ${f.user.name || f.user.username} as a friend?`)) onRemove(f.id);
            }}
          >
            &times;
          </button>
        </div>
      ))}
    </div>
  );
}
