const devUsersById = new Map();
const devUsersByGoogleId = new Map();
const devApplicationsByUserId = new Map();
const devFriendshipsById = new Map();
let nextDevFriendshipId = 1;

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
  user.username ??= null;

  devUsersByGoogleId.set(googleId, user);
  devUsersById.set(user.id, user);
  return user;
}

export function getDevUserById(id) {
  return devUsersById.get(id) ?? null;
}

export function getDevUserByUsername(username) {
  const normalized = username.toLowerCase();
  for (const user of devUsersById.values()) {
    if (user.username === normalized) return user;
  }
  return null;
}

export function setDevUsername(userId, username) {
  const user = getDevUserById(userId);
  if (!user) return { ok: false, error: 'not-found' };
  if (user.username) return { ok: false, error: 'already-set' };
  if (getDevUserByUsername(username)) return { ok: false, error: 'taken' };
  user.username = username;
  return { ok: true, user };
}

export function getDevApplications(userId) {
  return devApplicationsByUserId.get(userId) ?? [];
}

export function replaceDevApplications(userId, rows) {
  devApplicationsByUserId.set(userId, rows);
}

export function findDevFriendship(userIdA, userIdB) {
  for (const friendship of devFriendshipsById.values()) {
    const sameDirection = friendship.requesterId === userIdA && friendship.addresseeId === userIdB;
    const reverseDirection = friendship.requesterId === userIdB && friendship.addresseeId === userIdA;
    if (sameDirection || reverseDirection) return friendship;
  }
  return null;
}

export function createDevFriendship(requesterId, addresseeId) {
  if (findDevFriendship(requesterId, addresseeId)) {
    return { ok: false, error: 'exists' };
  }

  const friendship = {
    id: nextDevFriendshipId++,
    requesterId,
    addresseeId,
    status: 'pending',
    createdAt: new Date(),
    respondedAt: null,
  };
  devFriendshipsById.set(friendship.id, friendship);
  return { ok: true, friendship };
}

export function getDevFriendshipById(id) {
  return devFriendshipsById.get(id) ?? null;
}

export function respondDevFriendship(id, status) {
  const friendship = getDevFriendshipById(id);
  if (!friendship) return null;
  friendship.status = status;
  friendship.respondedAt = new Date();
  return friendship;
}

export function deleteDevFriendship(id) {
  return devFriendshipsById.delete(id);
}

export function listDevFriendships(userId) {
  const incoming = [];
  const outgoing = [];
  const accepted = [];

  for (const friendship of devFriendshipsById.values()) {
    const isRequester = friendship.requesterId === userId;
    const isAddressee = friendship.addresseeId === userId;
    if (!isRequester && !isAddressee) continue;

    if (friendship.status === 'accepted') {
      const otherUserId = isRequester ? friendship.addresseeId : friendship.requesterId;
      const otherUser = getDevUserById(otherUserId);
      if (otherUser?.username) accepted.push({ id: friendship.id, username: otherUser.username });
      continue;
    }

    if (friendship.status !== 'pending') continue;
    if (isAddressee) {
      const requester = getDevUserById(friendship.requesterId);
      if (requester?.username) incoming.push({ id: friendship.id, username: requester.username });
    } else {
      const addressee = getDevUserById(friendship.addresseeId);
      if (addressee?.username) outgoing.push({ id: friendship.id, username: addressee.username });
    }
  }

  return { incoming, outgoing, accepted };
}

export function resetDevStore() {
  devUsersById.clear();
  devUsersByGoogleId.clear();
  devApplicationsByUserId.clear();
  devFriendshipsById.clear();
  nextDevFriendshipId = 1;
}
