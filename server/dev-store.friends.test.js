import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('dev-store friendship helpers', () => {
  let store;

  beforeEach(async () => {
    vi.resetModules();
    store = await import('./dev-store.js');
  });

  function makeUser(email) {
    return store.upsertDevUser({ googleId: `dev:${email}`, email, name: email, avatarUrl: '' });
  }

  it('sets and looks up usernames, keeping the reverse index in sync on change', () => {
    const alice = store.setDevUsername(makeUser('alice@example.com').id, 'alice1');
    expect(store.getDevUserByUsername('alice1')).toMatchObject({ id: alice.id });

    store.setDevUsername(alice.id, 'alice2');
    expect(store.getDevUserByUsername('alice1')).toBeNull();
    expect(store.getDevUserByUsername('alice2')).toMatchObject({ id: alice.id });
  });

  it('searches usernames by substring, excluding a given user id and usernameless users', () => {
    const alice = makeUser('alice@example.com');
    store.setDevUsername(alice.id, 'alice1');
    const bob = makeUser('bob@example.com');
    store.setDevUsername(bob.id, 'bobby');
    makeUser('carol@example.com');

    const results = store.searchDevUsersByUsername('b', alice.id);
    expect(results.map((u) => u.username)).toEqual(['bobby']);
  });

  it('creates a friend request and finds it from either direction', () => {
    const alice = makeUser('alice@example.com');
    const bob = makeUser('bob@example.com');
    const created = store.createDevFriendRequest(alice.id, bob.id);

    expect(store.findDevFriendshipBetween(alice.id, bob.id)).toMatchObject({ id: created.id });
    expect(store.findDevFriendshipBetween(bob.id, alice.id)).toMatchObject({ id: created.id });
    expect(store.findDevFriendshipBetween(alice.id, 999)).toBeNull();
  });

  it('updates friendship status and stamps respondedAt', () => {
    const alice = makeUser('alice@example.com');
    const bob = makeUser('bob@example.com');
    const created = store.createDevFriendRequest(alice.id, bob.id);
    expect(created.respondedAt).toBeNull();

    const updated = store.updateDevFriendshipStatus(created.id, 'accepted');
    expect(updated.status).toBe('accepted');
    expect(updated.respondedAt).toBeInstanceOf(Date);
  });

  it('deletes a friendship', () => {
    const alice = makeUser('alice@example.com');
    const bob = makeUser('bob@example.com');
    const created = store.createDevFriendRequest(alice.id, bob.id);
    store.deleteDevFriendship(created.id);
    expect(store.getDevFriendship(created.id)).toBeNull();
  });

  it('lists friendships for a user, optionally filtered by status', () => {
    const alice = makeUser('alice@example.com');
    const bob = makeUser('bob@example.com');
    const carol = makeUser('carol@example.com');
    const pending = store.createDevFriendRequest(alice.id, bob.id);
    const accepted = store.createDevFriendRequest(alice.id, carol.id);
    store.updateDevFriendshipStatus(accepted.id, 'accepted');

    expect(store.listDevFriendshipsForUser(alice.id).map((f) => f.id).sort()).toEqual(
      [pending.id, accepted.id].sort()
    );
    expect(store.listDevFriendshipsForUser(alice.id, 'accepted')).toEqual([accepted]);
    expect(store.listDevFriendshipsForUser(bob.id, 'accepted')).toEqual([]);
  });
});
