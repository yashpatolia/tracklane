import { beforeEach, describe, expect, it, vi } from 'vitest';

function mockRes() {
  return {
    statusCode: 200,
    body: undefined,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
  };
}

describe('friends router (dev-store mode)', () => {
  let devStore;
  let friends;

  beforeEach(async () => {
    vi.resetModules();
    delete process.env.DATABASE_URL;
    devStore = await import('./dev-store.js');
    friends = await import('./friends.js');
  });

  function makeUser(email, username) {
    const user = devStore.upsertDevUser({ googleId: `dev:${email}`, email, name: email, avatarUrl: '' });
    if (username) devStore.setDevUsername(user.id, username);
    return user;
  }

  describe('handleCheckUsername', () => {
    it('reports available for a valid, unused username', async () => {
      const alice = makeUser('alice@example.com');
      const req = { user: alice, query: { value: 'alice_1' } };
      const res = mockRes();
      await friends.handleCheckUsername(req, res);
      expect(res.body).toEqual({ available: true });
    });

    it('rejects invalid formats', async () => {
      const alice = makeUser('alice@example.com');
      const req = { user: alice, query: { value: 'a' } };
      const res = mockRes();
      await friends.handleCheckUsername(req, res);
      expect(res.body.available).toBe(false);
    });

    it('rejects a username already taken by someone else', async () => {
      makeUser('bob@example.com', 'bobby');
      const alice = makeUser('alice@example.com');
      const req = { user: alice, query: { value: 'BOBBY' } };
      const res = mockRes();
      await friends.handleCheckUsername(req, res);
      expect(res.body.available).toBe(false);
    });

    it('allows a user to check their own current username', async () => {
      const alice = makeUser('alice@example.com', 'alice1');
      const req = { user: alice, query: { value: 'alice1' } };
      const res = mockRes();
      await friends.handleCheckUsername(req, res);
      expect(res.body.available).toBe(true);
    });
  });

  describe('handleSetUsername', () => {
    it('sets a valid username', async () => {
      const alice = makeUser('alice@example.com');
      const req = { user: alice, body: { username: 'Alice_1' } };
      const res = mockRes();
      await friends.handleSetUsername(req, res);
      expect(res.body).toEqual({ username: 'alice_1' });
    });

    it('rejects an invalid format with 400', async () => {
      const alice = makeUser('alice@example.com');
      const req = { user: alice, body: { username: '!!' } };
      const res = mockRes();
      await friends.handleSetUsername(req, res);
      expect(res.statusCode).toBe(400);
    });

    it('rejects a taken username with 409', async () => {
      makeUser('bob@example.com', 'bobby');
      const alice = makeUser('alice@example.com');
      const req = { user: alice, body: { username: 'bobby' } };
      const res = mockRes();
      await friends.handleSetUsername(req, res);
      expect(res.statusCode).toBe(409);
    });

    it('lets a user change their existing username, freeing the old one', async () => {
      const alice = makeUser('alice@example.com', 'oldname');
      const req = { user: alice, body: { username: 'newname' } };
      const res = mockRes();
      await friends.handleSetUsername(req, res);
      expect(res.body).toEqual({ username: 'newname' });
      expect(devStore.getDevUserByUsername('oldname')).toBeNull();
    });
  });

  describe('handleSearchUsers', () => {
    it('excludes self and usernameless users, includes friendshipStatus', async () => {
      const alice = makeUser('alice@example.com', 'alice1');
      makeUser('bob@example.com', 'bob1');
      makeUser('carol@example.com');

      const req = { user: alice, query: { q: 'b' } };
      const res = mockRes();
      await friends.handleSearchUsers(req, res);

      expect(res.body).toHaveLength(1);
      expect(res.body[0]).toMatchObject({ username: 'bob1', friendshipStatus: 'none' });
    });

    it('reports pending_sent, pending_received, and friends statuses correctly', async () => {
      const alice = makeUser('alice@example.com', 'alice1');
      const bob = makeUser('bob@example.com', 'bob1');
      const carol = makeUser('carol@example.com', 'carol1');
      const dave = makeUser('dave@example.com', 'dave1');

      await friends.handleSendFriendRequest({ user: alice, body: { addresseeId: bob.id } }, mockRes());
      await friends.handleSendFriendRequest({ user: carol, body: { addresseeId: alice.id } }, mockRes());
      const acceptRes = mockRes();
      await friends.handleSendFriendRequest({ user: alice, body: { addresseeId: dave.id } }, mockRes());

      const daveReq = devStore.findDevFriendshipBetween(alice.id, dave.id);
      await friends.handleAcceptFriendRequest({ user: dave, params: { id: String(daveReq.id) } }, acceptRes);

      const res = mockRes();
      await friends.handleSearchUsers({ user: alice, query: { q: '1' } }, res);
      const byUsername = Object.fromEntries(res.body.map((u) => [u.username, u.friendshipStatus]));
      expect(byUsername.bob1).toBe('pending_sent');
      expect(byUsername.carol1).toBe('pending_received');
      expect(byUsername.dave1).toBe('friends');
    });
  });

  describe('handleSendFriendRequest', () => {
    it('rejects sending a request to yourself', async () => {
      const alice = makeUser('alice@example.com', 'alice1');
      const res = mockRes();
      await friends.handleSendFriendRequest({ user: alice, body: { addresseeId: alice.id } }, res);
      expect(res.statusCode).toBe(400);
    });

    it('rejects a duplicate pending request', async () => {
      const alice = makeUser('alice@example.com', 'alice1');
      const bob = makeUser('bob@example.com', 'bob1');
      await friends.handleSendFriendRequest({ user: alice, body: { addresseeId: bob.id } }, mockRes());
      const res = mockRes();
      await friends.handleSendFriendRequest({ user: alice, body: { addresseeId: bob.id } }, res);
      expect(res.statusCode).toBe(409);
    });

    it('rejects a request between users who are already friends', async () => {
      const alice = makeUser('alice@example.com', 'alice1');
      const bob = makeUser('bob@example.com', 'bob1');
      await friends.handleSendFriendRequest({ user: alice, body: { addresseeId: bob.id } }, mockRes());
      const created = devStore.findDevFriendshipBetween(alice.id, bob.id);
      await friends.handleAcceptFriendRequest({ user: bob, params: { id: String(created.id) } }, mockRes());

      const res = mockRes();
      await friends.handleSendFriendRequest({ user: bob, body: { addresseeId: alice.id } }, res);
      expect(res.statusCode).toBe(409);
    });

    it('succeeds for a valid new request', async () => {
      const alice = makeUser('alice@example.com', 'alice1');
      const bob = makeUser('bob@example.com', 'bob1');
      const res = mockRes();
      await friends.handleSendFriendRequest({ user: alice, body: { addresseeId: bob.id } }, res);
      expect(res.body).toMatchObject({ requesterId: alice.id, addresseeId: bob.id, status: 'pending' });
    });
  });

  describe('handleAcceptFriendRequest / handleDeclineFriendRequest', () => {
    it('rejects accepting a request you are not the addressee of', async () => {
      const alice = makeUser('alice@example.com', 'alice1');
      const bob = makeUser('bob@example.com', 'bob1');
      await friends.handleSendFriendRequest({ user: alice, body: { addresseeId: bob.id } }, mockRes());
      const created = devStore.findDevFriendshipBetween(alice.id, bob.id);

      const res = mockRes();
      await friends.handleAcceptFriendRequest({ user: alice, params: { id: String(created.id) } }, res);
      expect(res.statusCode).toBe(403);
    });

    it('accepts a pending request as the addressee', async () => {
      const alice = makeUser('alice@example.com', 'alice1');
      const bob = makeUser('bob@example.com', 'bob1');
      await friends.handleSendFriendRequest({ user: alice, body: { addresseeId: bob.id } }, mockRes());
      const created = devStore.findDevFriendshipBetween(alice.id, bob.id);

      const res = mockRes();
      await friends.handleAcceptFriendRequest({ user: bob, params: { id: String(created.id) } }, res);
      expect(res.body.status).toBe('accepted');
    });

    it('rejects declining a request you are not the addressee of', async () => {
      const alice = makeUser('alice@example.com', 'alice1');
      const bob = makeUser('bob@example.com', 'bob1');
      await friends.handleSendFriendRequest({ user: alice, body: { addresseeId: bob.id } }, mockRes());
      const created = devStore.findDevFriendshipBetween(alice.id, bob.id);

      const res = mockRes();
      await friends.handleDeclineFriendRequest({ user: alice, params: { id: String(created.id) } }, res);
      expect(res.statusCode).toBe(403);
    });

    it('declining removes the row, allowing a fresh request afterward', async () => {
      const alice = makeUser('alice@example.com', 'alice1');
      const bob = makeUser('bob@example.com', 'bob1');
      await friends.handleSendFriendRequest({ user: alice, body: { addresseeId: bob.id } }, mockRes());
      const created = devStore.findDevFriendshipBetween(alice.id, bob.id);

      await friends.handleDeclineFriendRequest({ user: bob, params: { id: String(created.id) } }, mockRes());
      expect(devStore.findDevFriendshipBetween(alice.id, bob.id)).toBeNull();

      const res = mockRes();
      await friends.handleSendFriendRequest({ user: alice, body: { addresseeId: bob.id } }, res);
      expect(res.statusCode).toBe(200);
    });
  });

  describe('handleRemoveFriendship', () => {
    it('rejects removal by a non-party', async () => {
      const alice = makeUser('alice@example.com', 'alice1');
      const bob = makeUser('bob@example.com', 'bob1');
      const carol = makeUser('carol@example.com', 'carol1');
      await friends.handleSendFriendRequest({ user: alice, body: { addresseeId: bob.id } }, mockRes());
      const created = devStore.findDevFriendshipBetween(alice.id, bob.id);
      await friends.handleAcceptFriendRequest({ user: bob, params: { id: String(created.id) } }, mockRes());

      const res = mockRes();
      await friends.handleRemoveFriendship({ user: carol, params: { id: String(created.id) } }, res);
      expect(res.statusCode).toBe(403);
    });

    it('allows either party to remove an accepted friendship', async () => {
      const alice = makeUser('alice@example.com', 'alice1');
      const bob = makeUser('bob@example.com', 'bob1');
      await friends.handleSendFriendRequest({ user: alice, body: { addresseeId: bob.id } }, mockRes());
      const created = devStore.findDevFriendshipBetween(alice.id, bob.id);
      await friends.handleAcceptFriendRequest({ user: bob, params: { id: String(created.id) } }, mockRes());

      const res = mockRes();
      await friends.handleRemoveFriendship({ user: alice, params: { id: String(created.id) } }, res);
      expect(res.body).toEqual({ ok: true });
      expect(devStore.getDevFriendship(created.id)).toBeNull();
    });

    it('allows the requester to cancel their own pending request, but not the addressee', async () => {
      const alice = makeUser('alice@example.com', 'alice1');
      const bob = makeUser('bob@example.com', 'bob1');
      await friends.handleSendFriendRequest({ user: alice, body: { addresseeId: bob.id } }, mockRes());
      const created = devStore.findDevFriendshipBetween(alice.id, bob.id);

      const forbidden = mockRes();
      await friends.handleRemoveFriendship({ user: bob, params: { id: String(created.id) } }, forbidden);
      expect(forbidden.statusCode).toBe(403);

      const ok = mockRes();
      await friends.handleRemoveFriendship({ user: alice, params: { id: String(created.id) } }, ok);
      expect(ok.body).toEqual({ ok: true });
    });
  });

  describe('handleListFriends / handleListFriendRequests', () => {
    it('lists only accepted friendships with the other user resolved', async () => {
      const alice = makeUser('alice@example.com', 'alice1');
      const bob = makeUser('bob@example.com', 'bob1');
      const carol = makeUser('carol@example.com', 'carol1');
      await friends.handleSendFriendRequest({ user: alice, body: { addresseeId: bob.id } }, mockRes());
      const created = devStore.findDevFriendshipBetween(alice.id, bob.id);
      await friends.handleAcceptFriendRequest({ user: bob, params: { id: String(created.id) } }, mockRes());
      await friends.handleSendFriendRequest({ user: alice, body: { addresseeId: carol.id } }, mockRes());

      const res = mockRes();
      await friends.handleListFriends({ user: alice, query: {} }, res);
      expect(res.body).toHaveLength(1);
      expect(res.body[0].user.username).toBe('bob1');
    });

    it('splits pending requests by incoming vs outgoing direction', async () => {
      const alice = makeUser('alice@example.com', 'alice1');
      const bob = makeUser('bob@example.com', 'bob1');
      const carol = makeUser('carol@example.com', 'carol1');
      await friends.handleSendFriendRequest({ user: alice, body: { addresseeId: bob.id } }, mockRes());
      await friends.handleSendFriendRequest({ user: carol, body: { addresseeId: alice.id } }, mockRes());

      const incoming = mockRes();
      await friends.handleListFriendRequests({ user: alice, query: { direction: 'incoming' } }, incoming);
      expect(incoming.body).toHaveLength(1);
      expect(incoming.body[0].user.username).toBe('carol1');

      const outgoing = mockRes();
      await friends.handleListFriendRequests({ user: alice, query: { direction: 'outgoing' } }, outgoing);
      expect(outgoing.body).toHaveLength(1);
      expect(outgoing.body[0].user.username).toBe('bob1');
    });
  });
});
