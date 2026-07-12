async function readJson(res) {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Request failed.');
  return data;
}

export async function claimUsername(username) {
  const res = await fetch('/api/username', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username }),
  });
  return readJson(res);
}

export async function searchUsername(username) {
  const res = await fetch(`/api/friends/search?username=${encodeURIComponent(username)}`);
  return readJson(res);
}

export async function sendFriendRequest(username) {
  const res = await fetch('/api/friends/request', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username }),
  });
  return readJson(res);
}

export async function fetchFriends() {
  const res = await fetch('/api/friends');
  return readJson(res);
}

export async function acceptFriendRequest(id) {
  const res = await fetch(`/api/friends/${id}/accept`, { method: 'POST' });
  return readJson(res);
}

export async function declineFriendRequest(id) {
  const res = await fetch(`/api/friends/${id}/decline`, { method: 'POST' });
  return readJson(res);
}

export async function cancelFriendRequest(id) {
  const res = await fetch(`/api/friends/${id}/cancel`, { method: 'POST' });
  return readJson(res);
}
