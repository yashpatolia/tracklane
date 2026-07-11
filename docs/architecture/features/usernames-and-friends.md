# Usernames And Friends

## Purpose

This feature gives users a public immutable username and lets them send,
accept, decline, and cancel friend requests. It also changes new user creation
to use app-generated 63-bit Snowflake-style `bigint` IDs instead of relying on
Postgres auto-increment IDs.

These are related in this branch, but they solve different problems:

- Usernames are the public lookup key for friend discovery.
- Internal user IDs remain server-only and are used for database relations.
- Snowflake-style IDs avoid future coordination around auto-increment user IDs.

## Source Map

Backend:

- `server/id-generator.js` — mints BigInt user IDs for new Postgres users.
- `server/auth.js` — creates new users with generated IDs and serializes IDs as
  strings in sessions.
- `server/index.js` — exposes `/api/me`, `/api/username`, and mounts
  `/api/friends`.
- `server/friends.js` — friend search, request, accept, decline, cancel, and
  list routes.
- `server/dev-store.js` — in-memory fallback implementation for usernames and
  friendships when `DATABASE_URL` is unset.
- `server/db/schema.js` — `users.username`, `users.id` as `bigint`, and the
  `friendships` table.

Frontend:

- `src/friends-api.js` — fetch wrappers for username and friends endpoints.
- `src/components/SettingsModal.jsx` — one-time username claim UI.
- `src/components/FriendsView.jsx` — friends section composition.
- `src/components/FriendSearchResults.jsx` — exact username search and request.
- `src/components/FriendRequestsList.jsx` — incoming/outgoing request actions.
- `src/components/FriendsList.jsx` — accepted friends list.
- `src/App.jsx` — username gate and Friends section wiring.
- `src/components/Header.jsx` — Friends nav link and Settings button.

Database:

- `drizzle/0005_widen_user_id_and_username.sql`
- `drizzle/0006_add_friendships.sql`

Tests:

- `server/id-generator.test.js`
- `server/db/schema.test.js`
- `server/dev-store.friends.test.js`
- `server/friends.test.js`
- `src/components/SettingsModal.test.jsx`
- `src/components/FriendsView.test.jsx`
- `src/App.test.jsx`

## Data Model

`users.username` is nullable until the user claims a username. Once set, the
application treats it as immutable.

The `users.username` unique index is the production correctness mechanism for
username uniqueness. Application code validates and normalizes usernames, but
Postgres decides whether a username is globally available.

`friendships` stores one row per pair of users:

- `requester_id` — user who sent the request.
- `addressee_id` — user who receives and can accept/decline.
- `status` — only `pending` or `accepted`.
- `responded_at` — set when accepted.

Decline and cancel delete the friendship row. There is no `declined` status.

The unique expression index on
`LEAST(requester_id, addressee_id), GREATEST(requester_id, addressee_id)`
guarantees that only one row can exist between two users, regardless of request
direction.

## API Behavior

`PUT /api/username`

- Requires auth.
- Accepts `{ username }`.
- Normalizes to lowercase and trims whitespace.
- Requires `^[a-z0-9_]{3,20}$`.
- Returns `400` for invalid username or attempts to change an existing
  username.
- Returns `409` when the username is already taken.
- Returns `{ username }` on success.

`GET /api/friends/search?username=X`

- Requires auth and requires the caller to already have a username.
- Exact username lookup only.
- Returns `{ username }` on match.
- Returns `404` when no user exists.

`POST /api/friends/request`

- Requires auth and requires the caller to already have a username.
- Accepts `{ username }` for the target.
- Returns `400` for self-requests.
- Returns `404` when the target username does not exist.
- Returns `409` when a pending or accepted friendship already exists.
- Returns `{ ok: true }` on success.

`GET /api/friends`

- Returns `{ incoming, outgoing, accepted }`.
- Entries expose friendship row `id` and the other user's `username`.
- Internal user IDs never cross this API boundary.

`POST /api/friends/:id/accept`

- Only the addressee can accept.
- Converts a pending request to `accepted`.

`POST /api/friends/:id/decline`

- Only the addressee can decline.
- Deletes the pending request row.

`POST /api/friends/:id/cancel`

- Only the requester can cancel.
- Deletes the pending request row.

## UI Behavior

Users can continue using the application tracker without a username. The
Friends section is gated until a username is set.

The Friends UI intentionally supports exact username lookup only. There is no
typeahead, fuzzy search, friend suggestion system, email lookup, or name lookup.

The current UI supports:

- Claim username in Settings.
- Search exact username.
- Send friend request.
- Accept or decline incoming request.
- Cancel outgoing request.
- View accepted friends.

## Invariants

- Usernames are lowercase, 3-20 chars, and contain only `a-z`, `0-9`, and `_`.
- Usernames are immutable once set.
- User IDs are internal. Do not serialize raw `BigInt` IDs to JSON responses.
- A user must have a username before using `/api/friends`.
- At most one friendship row can exist between two users.
- `friendships.status` is only `pending` or `accepted`.
- Decline/cancel delete rows instead of writing a terminal status.
- The Postgres unique indexes are the source of truth for uniqueness.

## Efficiency Notes

Production username checks are backed by the `users_username_unique` B-tree
index. Postgres does not scan the whole users table to decide whether a
username is taken.

Production friendship existence is enforced by the unique pair expression
index. The request endpoint attempts the insert and maps Postgres unique
violation `23505` to `409`. This avoids race-prone SELECT-then-INSERT logic.

The in-memory dev store uses simple Map iteration for username/friendship
lookups. That is acceptable because it is only a no-Postgres local fallback.

## Testing

Run all tests:

```bash
npm test
```

Run focused tests:

```bash
npx vitest run server/dev-store.friends.test.js server/friends.test.js
npx vitest run src/components/SettingsModal.test.jsx src/components/FriendsView.test.jsx src/App.test.jsx
```

Run production build validation:

```bash
npm run build
```

## Known Non-Goals

- No unfriending accepted friends.
- No friend recommendations.
- No partial/typeahead username search.
- No visibility into other users' applications.
- No username changes after claim.
- No moderation/admin tooling.
