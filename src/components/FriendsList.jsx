export default function FriendsList({ friends }) {
  return (
    <section className="friend-card">
      <span className="form-section__title">Friends</span>
      {friends.length === 0 && <p className="friend-empty">No friends yet.</p>}
      {friends.map((friend) => (
        <div className="friend-row" key={friend.id}>
          <span>@{friend.username}</span>
        </div>
      ))}
    </section>
  );
}
