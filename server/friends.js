import express from 'express';
import { and, eq, or } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import { db } from './db/index.js';
import { friendships, users } from './db/schema.js';
import {
  createDevFriendship,
  deleteDevFriendship,
  getDevFriendshipById,
  getDevUserByUsername,
  listDevFriendships,
  respondDevFriendship,
} from './dev-store.js';

export const USERNAME_PATTERN = /^[a-z0-9_]{3,20}$/;

export function normalizeUsername(value) {
  return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

export function isValidUsername(value) {
  return USERNAME_PATTERN.test(value);
}

function sameId(a, b) {
  return String(a) === String(b);
}

function parseFriendshipId(value) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function isUniqueViolation(err) {
  return err?.code === '23505';
}

async function findUserByUsername(username) {
  if (!process.env.DATABASE_URL) return getDevUserByUsername(username);
  const [user] = await db.select().from(users).where(eq(users.username, username));
  return user ?? null;
}

async function createFriendship(requesterId, addresseeId) {
  if (!process.env.DATABASE_URL) return createDevFriendship(requesterId, addresseeId);

  try {
    const [friendship] = await db.insert(friendships).values({ requesterId, addresseeId }).returning();
    return { ok: true, friendship };
  } catch (err) {
    if (isUniqueViolation(err)) return { ok: false, error: 'exists' };
    throw err;
  }
}

async function getFriendship(id) {
  if (!process.env.DATABASE_URL) return getDevFriendshipById(id);
  const [friendship] = await db.select().from(friendships).where(eq(friendships.id, id));
  return friendship ?? null;
}

async function listFriendships(userId) {
  if (!process.env.DATABASE_URL) return listDevFriendships(userId);

  const requester = alias(users, 'requester');
  const addressee = alias(users, 'addressee');
  const rows = await db
    .select({
      id: friendships.id,
      requesterId: friendships.requesterId,
      addresseeId: friendships.addresseeId,
      status: friendships.status,
      requesterUsername: requester.username,
      addresseeUsername: addressee.username,
    })
    .from(friendships)
    .leftJoin(requester, eq(friendships.requesterId, requester.id))
    .leftJoin(addressee, eq(friendships.addresseeId, addressee.id))
    .where(or(eq(friendships.requesterId, userId), eq(friendships.addresseeId, userId)));

  const incoming = [];
  const outgoing = [];
  const accepted = [];

  for (const row of rows) {
    const isRequester = sameId(row.requesterId, userId);
    if (row.status === 'accepted') {
      accepted.push({ id: row.id, username: isRequester ? row.addresseeUsername : row.requesterUsername });
    } else if (row.status === 'pending' && isRequester) {
      outgoing.push({ id: row.id, username: row.addresseeUsername });
    } else if (row.status === 'pending') {
      incoming.push({ id: row.id, username: row.requesterUsername });
    }
  }

  return { incoming, outgoing, accepted };
}

async function acceptFriendship(id) {
  if (!process.env.DATABASE_URL) return respondDevFriendship(id, 'accepted');
  const [friendship] = await db
    .update(friendships)
    .set({ status: 'accepted', respondedAt: new Date() })
    .where(and(eq(friendships.id, id), eq(friendships.status, 'pending')))
    .returning();
  return friendship ?? null;
}

async function removeFriendship(id) {
  if (!process.env.DATABASE_URL) return deleteDevFriendship(id);
  const deleted = await db.delete(friendships).where(eq(friendships.id, id)).returning();
  return deleted.length > 0;
}

const router = express.Router();

router.use((req, res, next) => {
  if (!req.user?.username) {
    return res.status(400).json({ error: 'Set a username before using friends.' });
  }
  next();
});

router.get('/search', async (req, res, next) => {
  try {
    const username = normalizeUsername(req.query.username);
    if (!isValidUsername(username)) return res.status(400).json({ error: 'Invalid username.' });
    const user = await findUserByUsername(username);
    if (!user) return res.status(404).json({ error: 'User not found.' });
    res.json({ username: user.username });
  } catch (err) {
    next(err);
  }
});

router.post('/request', async (req, res, next) => {
  try {
    const username = normalizeUsername(req.body?.username);
    if (!isValidUsername(username)) return res.status(400).json({ error: 'Invalid username.' });

    const target = await findUserByUsername(username);
    if (!target) return res.status(404).json({ error: 'User not found.' });
    if (sameId(target.id, req.user.id)) return res.status(400).json({ error: 'Cannot send a friend request to yourself.' });

    const result = await createFriendship(req.user.id, target.id);
    if (!result.ok && result.error === 'exists') {
      return res.status(409).json({ error: 'Friendship or request already exists.' });
    }
    res.status(201).json({ ok: true });
  } catch (err) {
    next(err);
  }
});

router.get('/', async (req, res, next) => {
  try {
    res.json(await listFriendships(req.user.id));
  } catch (err) {
    next(err);
  }
});

router.post('/:id/accept', async (req, res, next) => {
  try {
    const id = parseFriendshipId(req.params.id);
    if (!id) return res.status(404).json({ error: 'Friend request not found.' });

    const friendship = await getFriendship(id);
    if (!friendship || friendship.status !== 'pending') return res.status(404).json({ error: 'Friend request not found.' });
    if (!sameId(friendship.addresseeId, req.user.id)) return res.status(403).json({ error: 'Only the addressee can accept this request.' });

    await acceptFriendship(id);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

router.post('/:id/decline', async (req, res, next) => {
  try {
    const id = parseFriendshipId(req.params.id);
    if (!id) return res.status(404).json({ error: 'Friend request not found.' });

    const friendship = await getFriendship(id);
    if (!friendship || friendship.status !== 'pending') return res.status(404).json({ error: 'Friend request not found.' });
    if (!sameId(friendship.addresseeId, req.user.id)) return res.status(403).json({ error: 'Only the addressee can decline this request.' });

    await removeFriendship(id);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

router.post('/:id/cancel', async (req, res, next) => {
  try {
    const id = parseFriendshipId(req.params.id);
    if (!id) return res.status(404).json({ error: 'Friend request not found.' });

    const friendship = await getFriendship(id);
    if (!friendship || friendship.status !== 'pending') return res.status(404).json({ error: 'Friend request not found.' });
    if (!sameId(friendship.requesterId, req.user.id)) return res.status(403).json({ error: 'Only the requester can cancel this request.' });

    await removeFriendship(id);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

export default router;
