const devUsersById = new Map();
const devUsersByGoogleId = new Map();
const devApplicationsByUserId = new Map();

export function upsertDevUser({ googleId, email, name, avatarUrl }) {
  const existing = devUsersByGoogleId.get(googleId);
  const user = existing ?? {
    id: devUsersById.size + 1,
    googleId,
    email,
    name,
    avatarUrl,
  };

  user.googleId = googleId;
  user.email = email;
  user.name = name;
  user.avatarUrl = avatarUrl;

  devUsersByGoogleId.set(googleId, user);
  devUsersById.set(user.id, user);
  return user;
}

export function getDevUserById(id) {
  return devUsersById.get(id) ?? null;
}

export function getDevApplications(userId) {
  return devApplicationsByUserId.get(userId) ?? [];
}

export function replaceDevApplications(userId, rows) {
  devApplicationsByUserId.set(userId, rows);
}
