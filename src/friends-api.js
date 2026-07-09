async function requestJson(url, options) {
  const res = await fetch(url, options);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Something went wrong.');
  return data;
}

export async function checkUsername(value) {
  return requestJson(`/api/username/check?value=${encodeURIComponent(value)}`);
}

export async function setUsername(username) {
  return requestJson('/api/username', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username }),
  });
}

export async function searchUsers(query) {
  return requestJson(`/api/users/search?q=${encodeURIComponent(query)}`);
}

export async function sendFriendRequest(addresseeId) {
  return requestJson('/api/friends/requests', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ addresseeId }),
  });
}

export async function acceptFriendRequest(id) {
  return requestJson(`/api/friends/requests/${id}/accept`, { method: 'POST' });
}

export async function declineFriendRequest(id) {
  return requestJson(`/api/friends/requests/${id}/decline`, { method: 'POST' });
}

export async function removeFriendship(id) {
  return requestJson(`/api/friends/${id}`, { method: 'DELETE' });
}

export async function fetchFriends() {
  return requestJson('/api/friends');
}

export async function fetchFriendRequests(direction) {
  return requestJson(`/api/friends/requests?direction=${direction}`);
}
