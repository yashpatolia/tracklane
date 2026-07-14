export default function FriendsList({ friends }) {
  return (
    <section className="friend-card">
      <span className="form-section__title">Roster</span>
      {friends.length === 0 && <p className="friend-empty">No friends yet. Search for a username above to send a request.</p>}
      {friends.length > 0 && (
        <ol className="roster">
          {friends.map((friend, i) => (
            <li className="roster-item" key={friend.id}>
              <span className="roster-item__rail" aria-hidden="true">
                <span className="roster-node" />
                {i < friends.length - 1 && <span className="roster-track" />}
              </span>
              <span className="roster-handle">@{friend.username}</span>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
