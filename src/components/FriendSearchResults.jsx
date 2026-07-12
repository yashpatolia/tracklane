import { useState } from 'react';
import { searchUsername, sendFriendRequest } from '../friends-api.js';

export default function FriendSearchResults({ onRequestSent }) {
  const [query, setQuery] = useState('');
  const [result, setResult] = useState(null);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSearch = async (event) => {
    event.preventDefault();
    setLoading(true);
    setResult(null);
    setMessage('');
    try {
      const found = await searchUsername(query);
      setResult(found);
    } catch (err) {
      setMessage(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async () => {
    if (!result) return;
    setLoading(true);
    setMessage('');
    try {
      await sendFriendRequest(result.username);
      setMessage(`Request sent to @${result.username}.`);
      setResult(null);
      setQuery('');
      onRequestSent();
    } catch (err) {
      setMessage(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="friend-card">
      <span className="form-section__title">Find a friend</span>
      <form className="friend-search" onSubmit={handleSearch}>
        <input
          aria-label="Search username"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Exact username"
        />
        <button type="submit" className="btn-secondary" disabled={loading || !query.trim()}>
          Search
        </button>
      </form>
      {result && (
        <div className="friend-row">
          <span>@{result.username}</span>
          <button type="button" className="btn-add" onClick={handleSend} disabled={loading}>
            Send request
          </button>
        </div>
      )}
      {message && <p className="friend-message">{message}</p>}
    </section>
  );
}
