const devUsersById = new Map();
const devUsersByGoogleId = new Map();
const devUsersByUsername = new Map();
const devApplicationsByUserId = new Map();
const devFriendshipsById = new Map();
let devFriendshipIdCounter = 0;

export function upsertDevUser({ googleId, email, name, avatarUrl }) {
  const existing = devUsersByGoogleId.get(googleId);
  const user = existing ?? {
    id: devUsersById.size + 1,
    googleId,
    email,
    name,
    avatarUrl,
    username: null,
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

export function getDevUserByUsername(username) {
  return devUsersByUsername.get(username) ?? null;
}

export function setDevUsername(userId, username) {
  const user = devUsersById.get(userId);
  if (!user) return null;

  if (user.username) devUsersByUsername.delete(user.username);
  user.username = username;
  devUsersByUsername.set(username, user);
  return user;
}

export function searchDevUsersByUsername(query, excludeUserId) {
  const q = query.toLowerCase();
  return [...devUsersById.values()].filter(
    (u) => u.username && u.id !== excludeUserId && u.username.includes(q)
  );
}

export function getDevApplications(userId) {
  return devApplicationsByUserId.get(userId) ?? [];
}

export function replaceDevApplications(userId, rows) {
  devApplicationsByUserId.set(userId, rows);
}

export function createDevFriendRequest(requesterId, addresseeId) {
  devFriendshipIdCounter += 1;
  const friendship = {
    id: devFriendshipIdCounter,
    requesterId,
    addresseeId,
    status: 'pending',
    createdAt: new Date(),
    respondedAt: null,
  };
  devFriendshipsById.set(friendship.id, friendship);
  return friendship;
}

export function getDevFriendship(id) {
  return devFriendshipsById.get(id) ?? null;
}

export function findDevFriendshipBetween(userIdA, userIdB) {
  return (
    [...devFriendshipsById.values()].find(
      (f) =>
        (f.requesterId === userIdA && f.addresseeId === userIdB) ||
        (f.requesterId === userIdB && f.addresseeId === userIdA)
    ) ?? null
  );
}

export function updateDevFriendshipStatus(id, status) {
  const friendship = devFriendshipsById.get(id);
  if (!friendship) return null;
  friendship.status = status;
  friendship.respondedAt = new Date();
  return friendship;
}

export function deleteDevFriendship(id) {
  devFriendshipsById.delete(id);
}

export function listDevFriendshipsForUser(userId, status) {
  return [...devFriendshipsById.values()].filter(
    (f) =>
      (f.requesterId === userId || f.addresseeId === userId) &&
      (!status || f.status === status)
  );
}
