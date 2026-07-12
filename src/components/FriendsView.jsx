import { useEffect, useState } from 'react';
import { fetchFriends } from '../friends-api.js';
import FriendRequestsList from './FriendRequestsList.jsx';
import FriendSearchResults from './FriendSearchResults.jsx';
import FriendsList from './FriendsList.jsx';

const EMPTY_FRIENDS = { incoming: [], outgoing: [], accepted: [] };

export default function FriendsView() {
  const [data, setData] = useState(EMPTY_FRIENDS);
  const [error, setError] = useState('');

  const load = async () => {
    try {
      setError('');
      setData((await fetchFriends()) ?? EMPTY_FRIENDS);
    } catch (err) {
      setError(err.message);
    }
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <section className="main friends-view" id="friends">
      <div className="toolbar">
        <h2>Friends</h2>
      </div>
      {error && <div className="form-error" role="alert">{error}</div>}
      <div className="friends-grid">
        <FriendSearchResults onRequestSent={load} />
        <FriendRequestsList incoming={data.incoming ?? []} outgoing={data.outgoing ?? []} onChanged={load} />
        <FriendsList friends={data.accepted ?? []} />
      </div>
    </section>
  );
}
