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
    <main className="main friends-page">
      <div className="friends-page__head">
        <div>
          <span className="friends-page__eyebrow">Network</span>
          <h2>Friends</h2>
          <p className="friends-page__sub">Fellow travelers on the same job hunt. Trade notes, compare pipelines.</p>
        </div>
        <div className="friends-page__count">
          <span className="friends-page__count-value">{(data.accepted ?? []).length}</span>
          <span className="friends-page__count-label">Connected</span>
        </div>
      </div>

      {error && <div className="form-error" role="alert">{error}</div>}

      <FriendSearchResults onRequestSent={load} />

      <div className="friends-page__body">
        <FriendRequestsList incoming={data.incoming ?? []} outgoing={data.outgoing ?? []} onChanged={load} />
        <FriendsList friends={data.accepted ?? []} />
      </div>
    </main>
  );
}
