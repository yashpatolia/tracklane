import express from 'express';
import { and, eq, ilike, ne, or } from 'drizzle-orm';
import { db } from './db/index.js';
import { friendships, users } from './db/schema.js';
import { requireAuth } from './auth.js';
import {
  createDevFriendRequest,
  deleteDevFriendship,
  findDevFriendshipBetween,
  getDevFriendship,
  getDevUserById,
  getDevUserByUsername,
  listDevFriendshipsForUser,
  searchDevUsersByUsername,
  setDevUsername,
  updateDevFriendshipStatus,
} from './dev-store.js';

const USERNAME_PATTERN = /^[a-z0-9_]{3,20}$/;

export function normalizeUsername(raw) {
  return (raw ?? '').toString().trim().toLowerCase();
}

export function validateUsernameFormat(username) {
  if (!USERNAME_PATTERN.test(username)) {
    return { valid: false, reason: '3-20 characters, lowercase letters, numbers, and underscores only.' };
  }
  return { valid: true };
}

async function findUserByUsername(username) {
  if (!process.env.DATABASE_URL) {
    return getDevUserByUsername(username);
  }
  const [user] = await db.select().from(users).where(eq(users.username, username));
  return user ?? null;
}

async function searchUsersByUsername(query, excludeUserId) {
  if (!process.env.DATABASE_URL) {
    return searchDevUsersByUsername(query, excludeUserId);
  }
  return db
    .select()
    .from(users)
    .where(and(ilike(users.username, `%${query}%`), ne(users.id, excludeUserId)))
    .limit(20);
}

async function setUsername(userId, username) {
  if (!process.env.DATABASE_URL) {
    return setDevUsername(userId, username);
  }
  const [updated] = await db.update(users).set({ username }).where(eq(users.id, userId)).returning();
  return updated ?? null;
}

async function findFriendshipBetween(userIdA, userIdB) {
  if (!process.env.DATABASE_URL) {
    return findDevFriendshipBetween(userIdA, userIdB);
  }
  const [row] = await db
    .select()
    .from(friendships)
    .where(
      or(
        and(eq(friendships.requesterId, userIdA), eq(friendships.addresseeId, userIdB)),
        and(eq(friendships.requesterId, userIdB), eq(friendships.addresseeId, userIdA))
      )
    );
  return row ?? null;
}

async function createFriendRequest(requesterId, addresseeId) {
  if (!process.env.DATABASE_URL) {
    return createDevFriendRequest(requesterId, addresseeId);
  }
  const [row] = await db.insert(friendships).values({ requesterId, addresseeId }).returning();
  return row;
}

async function getFriendshipById(id) {
  if (!process.env.DATABASE_URL) {
    return getDevFriendship(id);
  }
  const [row] = await db.select().from(friendships).where(eq(friendships.id, id));
  return row ?? null;
}

async function acceptFriendship(id) {
  if (!process.env.DATABASE_URL) {
    return updateDevFriendshipStatus(id, 'accepted');
  }
  const [row] = await db
    .update(friendships)
    .set({ status: 'accepted', respondedAt: new Date() })
    .where(eq(friendships.id, id))
    .returning();
  return row ?? null;
}

async function deleteFriendship(id) {
  if (!process.env.DATABASE_URL) {
    return deleteDevFriendship(id);
  }
  await db.delete(friendships).where(eq(friendships.id, id));
}

async function listFriendshipsForUser(userId, status) {
  if (!process.env.DATABASE_URL) {
    return listDevFriendshipsForUser(userId, status);
  }
  const condition = status
    ? and(or(eq(friendships.requesterId, userId), eq(friendships.addresseeId, userId)), eq(friendships.status, status))
    : or(eq(friendships.requesterId, userId), eq(friendships.addresseeId, userId));
  return db.select().from(friendships).where(condition);
}

async function findUserById(userId) {
  if (!process.env.DATABASE_URL) {
    return getDevUserById(userId);
  }
  const [user] = await db.select().from(users).where(eq(users.id, userId));
  return user ?? null;
}

function publicUser(user) {
  if (!user) return null;
  return { id: user.id, username: user.username, name: user.name, avatarUrl: user.avatarUrl };
}

function friendshipStatusFor(friendship, viewerId) {
  if (!friendship) return 'none';
  if (friendship.status === 'accepted') return 'friends';
  return friendship.requesterId === viewerId ? 'pending_sent' : 'pending_received';
}

export async function handleCheckUsername(req, res) {
  const username = normalizeUsername(req.query.value);
  const format = validateUsernameFormat(username);
  if (!format.valid) {
    return res.json({ available: false, reason: format.reason });
  }

  const existing = await findUserByUsername(username);
  if (existing && existing.id !== req.user.id) {
    return res.json({ available: false, reason: 'That username is already taken.' });
  }
  res.json({ available: true });
}

export async function handleSetUsername(req, res) {
  const username = normalizeUsername(req.body?.username);
  const format = validateUsernameFormat(username);
  if (!format.valid) {
    return res.status(400).json({ error: format.reason });
  }

  const existing = await findUserByUsername(username);
  if (existing && existing.id !== req.user.id) {
    return res.status(409).json({ error: 'That username is already taken.' });
  }

  const updated = await setUsername(req.user.id, username);
  res.json({ username: updated.username });
}

export async function handleSearchUsers(req, res) {
  const query = normalizeUsername(req.query.q);
  if (!query) return res.json([]);

  const found = await searchUsersByUsername(query, req.user.id);
  const results = await Promise.all(
    found.map(async (user) => {
      const friendship = await findFriendshipBetween(req.user.id, user.id);
      return { ...publicUser(user), friendshipStatus: friendshipStatusFor(friendship, req.user.id) };
    })
  );
  res.json(results);
}

export async function handleSendFriendRequest(req, res) {
  const addresseeId = Number(req.body?.addresseeId);
  if (!addresseeId || addresseeId === req.user.id) {
    return res.status(400).json({ error: 'A valid, different user is required.' });
  }

  const addressee = await findUserById(addresseeId);
  if (!addressee) {
    return res.status(404).json({ error: 'User not found.' });
  }

  const existing = await findFriendshipBetween(req.user.id, addresseeId);
  if (existing) {
    return res.status(409).json({ error: 'A friend request already exists between these users.' });
  }

  const created = await createFriendRequest(req.user.id, addresseeId);
  res.json(created);
}

export async function handleAcceptFriendRequest(req, res) {
  const id = Number(req.params.id);
  const friendship = await getFriendshipById(id);
  if (!friendship || friendship.addresseeId !== req.user.id) {
    return res.status(403).json({ error: 'Not authorized to accept this request.' });
  }
  if (friendship.status !== 'pending') {
    return res.status(400).json({ error: 'This request is no longer pending.' });
  }

  const updated = await acceptFriendship(id);
  res.json(updated);
}

export async function handleDeclineFriendRequest(req, res) {
  const id = Number(req.params.id);
  const friendship = await getFriendshipById(id);
  if (!friendship || friendship.addresseeId !== req.user.id) {
    return res.status(403).json({ error: 'Not authorized to decline this request.' });
  }

  await deleteFriendship(id);
  res.json({ ok: true });
}

export async function handleRemoveFriendship(req, res) {
  const id = Number(req.params.id);
  const friendship = await getFriendshipById(id);
  if (!friendship) {
    return res.status(404).json({ error: 'Friendship not found.' });
  }

  const isParty = friendship.requesterId === req.user.id || friendship.addresseeId === req.user.id;
  const canRemove = friendship.status === 'accepted' ? isParty : friendship.requesterId === req.user.id;
  if (!canRemove) {
    return res.status(403).json({ error: 'Not authorized to remove this friendship.' });
  }

  await deleteFriendship(id);
  res.json({ ok: true });
}

export async function handleListFriends(req, res) {
  const rows = await listFriendshipsForUser(req.user.id, 'accepted');
  const results = await Promise.all(
    rows.map(async (row) => {
      const otherId = row.requesterId === req.user.id ? row.addresseeId : row.requesterId;
      const other = await findUserById(otherId);
      return { id: row.id, user: publicUser(other) };
    })
  );
  res.json(results);
}

export async function handleListFriendRequests(req, res) {
  const direction = req.query.direction === 'outgoing' ? 'outgoing' : 'incoming';
  const rows = await listFriendshipsForUser(req.user.id, 'pending');
  const filtered = rows.filter((row) =>
    direction === 'incoming' ? row.addresseeId === req.user.id : row.requesterId === req.user.id
  );
  const results = await Promise.all(
    filtered.map(async (row) => {
      const otherId = row.requesterId === req.user.id ? row.addresseeId : row.requesterId;
      const other = await findUserById(otherId);
      return { id: row.id, user: publicUser(other) };
    })
  );
  res.json(results);
}

const router = express.Router();

router.get('/username/check', requireAuth, handleCheckUsername);
router.put('/username', requireAuth, handleSetUsername);
router.get('/users/search', requireAuth, handleSearchUsers);
router.post('/friends/requests', requireAuth, handleSendFriendRequest);
router.post('/friends/requests/:id/accept', requireAuth, handleAcceptFriendRequest);
router.post('/friends/requests/:id/decline', requireAuth, handleDeclineFriendRequest);
router.delete('/friends/:id', requireAuth, handleRemoveFriendship);
router.get('/friends', requireAuth, handleListFriends);
router.get('/friends/requests', requireAuth, handleListFriendRequests);

export default router;
