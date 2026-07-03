export async function fetchMe() {
  const res = await fetch('/api/me');
  if (!res.ok) throw new Error('Failed to load session');
  const { user } = await res.json();
  return user;
}

export async function logout() {
  await fetch('/auth/logout', { method: 'POST' });
}

export async function fetchApplications() {
  const res = await fetch('/api/applications');
  if (!res.ok) throw new Error('Failed to load applications');
  return res.json();
}

export async function saveApplications(data) {
  const res = await fetch('/api/applications', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to save applications');
}
