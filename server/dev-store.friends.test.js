import { beforeEach, describe, expect, it } from 'vitest';
import {
  createDevFriendship,
  deleteDevFriendship,
  getDevFriendshipById,
  getDevUserByUsername,
  listDevFriendships,
  resetDevStore,
  respondDevFriendship,
  setDevUsername,
  upsertDevUser,
} from './dev-store.js';

describe('dev-store friends', () => {
  beforeEach(() => {
    resetDevStore();
  });

  function createUser(name) {
    const user = upsertDevUser({
      googleId: `google:${name}`,
      email: `${name}@example.com`,
      name,
      avatarUrl: '',
    });
    const result = setDevUsername(user.id, name);
    expect(result.ok).toBe(true);
    return user;
  }

  it('sets immutable, unique usernames', () => {
    const alice = upsertDevUser({ googleId: 'a', email: 'a@example.com', name: 'Alice', avatarUrl: '' });
    const bob = upsertDevUser({ googleId: 'b', email: 'b@example.com', name: 'Bob', avatarUrl: '' });

    expect(setDevUsername(alice.id, 'alice')).toMatchObject({ ok: true });
    expect(getDevUserByUsername('alice')).toMatchObject({ id: alice.id });
    expect(setDevUsername(alice.id, 'alice2')).toEqual({ ok: false, error: 'already-set' });
    expect(setDevUsername(bob.id, 'alice')).toEqual({ ok: false, error: 'taken' });
  });

  it('creates a friendship and blocks duplicates in either direction', () => {
    const alice = createUser('alice');
    const bob = createUser('bob');

    const first = createDevFriendship(alice.id, bob.id);
    expect(first.ok).toBe(true);
    expect(createDevFriendship(alice.id, bob.id)).toEqual({ ok: false, error: 'exists' });
    expect(createDevFriendship(bob.id, alice.id)).toEqual({ ok: false, error: 'exists' });
  });

  it('lists incoming, outgoing, and accepted friendships', () => {
    const alice = createUser('alice');
    const bob = createUser('bob');
    const carol = createUser('carol');

    const pending = createDevFriendship(alice.id, bob.id);
    const accepted = createDevFriendship(alice.id, carol.id);
    respondDevFriendship(accepted.friendship.id, 'accepted');

    expect(listDevFriendships(alice.id)).toEqual({
      incoming: [],
      outgoing: [{ id: pending.friendship.id, username: 'bob' }],
      accepted: [{ id: accepted.friendship.id, username: 'carol' }],
    });
    expect(listDevFriendships(bob.id)).toEqual({
      incoming: [{ id: pending.friendship.id, username: 'alice' }],
      outgoing: [],
      accepted: [],
    });
    expect(listDevFriendships(carol.id).accepted).toEqual([{ id: accepted.friendship.id, username: 'alice' }]);
  });

  it('responds to and deletes friendships', () => {
    const alice = createUser('alice');
    const bob = createUser('bob');
    const { friendship } = createDevFriendship(alice.id, bob.id);

    expect(respondDevFriendship(friendship.id, 'accepted')).toMatchObject({ status: 'accepted' });
    expect(getDevFriendshipById(friendship.id)).toMatchObject({ status: 'accepted' });
    expect(deleteDevFriendship(friendship.id)).toBe(true);
    expect(getDevFriendshipById(friendship.id)).toBe(null);
  });
});
