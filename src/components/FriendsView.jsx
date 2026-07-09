import { useEffect, useState } from 'react';
import {
  acceptFriendRequest,
  declineFriendRequest,
  fetchFriendRequests,
  fetchFriends,
  removeFriendship,
  searchUsers,
  sendFriendRequest,
} from '../friends-api.js';
import FriendSearchResults from './FriendSearchResults.jsx';
import FriendRequestsList from './FriendRequestsList.jsx';
import FriendsList from './FriendsList.jsx';

export default function FriendsView({ hasUsername }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [friends, setFriends] = useState([]);
  const [incoming, setIncoming] = useState([]);
  const [outgoing, setOutgoing] = useState([]);
  const [loaded, setLoaded] = useState(false);

  const refreshFriendsAndRequests = async () => {
    const [friendsData, incomingData, outgoingData] = await Promise.all([
      fetchFriends(),
      fetchFriendRequests('incoming'),
      fetchFriendRequests('outgoing'),
    ]);
    setFriends(friendsData);
    setIncoming(incomingData);
    setOutgoing(outgoingData);
  };

  useEffect(() => {
    if (!hasUsername) return;
    refreshFriendsAndRequests()
      .catch((err) => alert(err.message))
      .finally(() => setLoaded(true));
  }, [hasUsername]);

  useEffect(() => {
    if (!hasUsername || !query.trim()) {
      setResults([]);
      return;
    }
    const timer = setTimeout(() => {
      searchUsers(query.trim()).then(setResults).catch((err) => alert(err.message));
    }, 300);
    return () => clearTimeout(timer);
  }, [query, hasUsername]);

  const handleSendRequest = async (addresseeId) => {
    try {
      await sendFriendRequest(addresseeId);
      await Promise.all([refreshFriendsAndRequests(), searchUsers(query.trim()).then(setResults)]);
    } catch (err) {
      alert(err.message);
    }
  };

  const handleAccept = async (id) => {
    try {
      await acceptFriendRequest(id);
      await refreshFriendsAndRequests();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDecline = async (id) => {
    try {
      await declineFriendRequest(id);
      await refreshFriendsAndRequests();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleRemove = async (id) => {
    try {
      await removeFriendship(id);
      await refreshFriendsAndRequests();
    } catch (err) {
      alert(err.message);
    }
  };

  if (!hasUsername) {
    return (
      <div className="empty-state">
        <span className="big">Set a username first</span>
        Open Settings to choose a handle before you can find and add friends.
      </div>
    );
  }

  return (
    <div className="friends-view">
      <div className="toolbar">
        <h2>Friends</h2>
      </div>

      <div className="form-section">
        <span className="form-section__title">Find people</span>
        <input
          type="text"
          className="friends-search__input"
          placeholder="Search by handle"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <FriendSearchResults results={results} onSendRequest={handleSendRequest} />
      </div>

      {loaded && (
        <>
          <div className="form-section">
            <span className="form-section__title">Requests</span>
            <FriendRequestsList
              incoming={incoming}
              outgoing={outgoing}
              onAccept={handleAccept}
              onDecline={handleDecline}
              onCancel={handleRemove}
            />
          </div>

          <div className="form-section">
            <span className="form-section__title">Your friends</span>
            <FriendsList friends={friends} onRemove={handleRemove} />
          </div>
        </>
      )}
    </div>
  );
}
