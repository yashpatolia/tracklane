# Usernames + Distributed User IDs + Friend Requests — Design

Date: 2026-07-10
Status: Approved, pre-implementation

## Context

Tracklane users currently authenticate via Google OAuth only; `users.id` is a
Postgres `serial` integer used as the FK target for `applications.user_id`.
There is no public-facing identity (no username) and no social graph.

A prior attempt at this feature (`092c53d`, PR #8, merged then reverted with
no recorded reason — not present on GitHub either) added a `username` text
column and a `friendships` table, both using plain `serial`/unique-constraint
IDs with no distributed-ID-generation concern. That code is gone from the
current branch (`feat/friendRequest`), which is a clean slate, but its
component/file layout is reused here as a known-working reference (see
"UI structure" below).

## Goals

1. Users can set a public, immutable username.
2. Each user gets a system-assigned unique ID, generated in a way that stays
   collision-free without needing single-database coordination — so that if
   this app ever grows into multiple DB instances/shards, no ID migration is
   required. (Explicit choice, made with the tradeoffs understood: a plain
   Postgres `serial` + unique constraint would already be fully correct at
   the ~1k-user, single-Postgres-instance scale this app runs at today; the
   Snowflake-style approach is deliberately chosen anyway, both as a learning
   exercise and to make future horizontal scaling free.)
3. Users can find each other by exact username and send/accept/decline/cancel
   friend requests.

## Out of scope

- Removing/unfriending an already-accepted friendship.
- Any visibility of application data between friends (this only builds the
  friend graph, per the original prior-attempt commit's own framing).
- Partial/typeahead username search — exact match only.
- Changing username after it's set.
- Any admin/moderation tooling.

## 1. ID generation (Snowflake-style)

A 63-bit ID (fits in a signed Postgres `bigint`), same layout Twitter's
Snowflake popularized:

- **41 bits** — milliseconds since a custom epoch (2026-01-01T00:00:00Z).
  ~69 years of range before rollover.
- **10 bits** — node ID (0–1023), read from `NODE_ID` env var at process
  start, defaults to `0` if unset.
- **12 bits** — per-millisecond sequence counter (0–4095). Incremented for
  each ID generated within the same millisecond on the same node. If it
  overflows (4096th ID in the same ms), the generator busy-waits until the
  next millisecond before continuing.

Implementation: `server/id-generator.js`, pure `BigInt` arithmetic, no
dependencies. A generator instance holds `lastTimestamp`/`sequence` in
memory (module-level state, one per process — sufficient since there's one
process per `NODE_ID`).

**Correction (verified against installed `drizzle-orm`/`pg` source during
planning):** the original draft of this section assumed the `pg` driver
returns `bigint` columns as JS strings by default. That's true of the raw
`pg` driver, but **not** of Drizzle's `bigint(name, { mode: 'bigint' })`
column type, which this schema uses — Drizzle explicitly converts driver
values to native JS `BigInt` on read (`mapFromDriverValue`), and the `pg`
driver's own `prepareValue` already stringifies any JS `BigInt` parameter
on write, so no manual string conversion is needed for reads or writes at
the DB layer.

The actual constraint: a 63-bit ID exceeds `Number.MAX_SAFE_INTEGER`
(2^53), so it must stay a native JS `BigInt` (or `.toString()` of one)
rather than a `Number` anywhere it's held in JS. `JSON.stringify` throws on
a raw `BigInt`, so it must never be placed directly into an HTTP JSON
response. In practice this project's design already keeps every user ID
server-side-only (usernames are the only thing exposed to clients — see
sections 3-4), so the single place a `BigInt` id needs explicit
string conversion is session serialization
(`passport.serializeUser`/`deserializeUser`, since `express-session`
JSON-serializes session data): serialize as `String(user.id)`, deserialize
by converting back with `BigInt(id)` before querying. `/api/me` drops the
`id` field from its response entirely (it was previously returned but
unused by the frontend) rather than needing to stringify it, keeping the
"internal ID never crosses the wire" property.

The ID generator itself (`server/id-generator.js`) returns a native
`BigInt` from `generate()` — not a string — since that's the type both
Drizzle and `pg` expect for `bigint` columns.

**Existence check + retry**: on user insert, the server generates an ID and
attempts the insert. If Postgres rejects it with a unique-violation
(`23505` — the `users.id` primary key), the server generates a fresh ID and
retries, up to 5 attempts before returning 500. Given the bit layout, a real
collision should never happen in practice (it would require the same node
to reuse a sequence number within the same millisecond, which the
in-memory counter already prevents) — this is a safety net, not the
primary correctness mechanism.

Node ID configuration is documented in `.env.example` as `NODE_ID` (blank/0
by default). Scaling to multiple app instances later means only setting a
distinct `NODE_ID` per instance — no code or schema change.

## 2. Data model

```sql
-- drizzle/0005_widen_user_id_and_username.sql
ALTER TABLE "users" ALTER COLUMN "id" TYPE bigint;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "username" text;
CREATE UNIQUE INDEX IF NOT EXISTS "users_username_unique" ON "users" ("username");
ALTER TABLE "applications" ALTER COLUMN "user_id" TYPE bigint;

-- drizzle/0006_add_friendships.sql
CREATE TABLE IF NOT EXISTS "friendships" (
  "id" serial PRIMARY KEY NOT NULL,
  "requester_id" bigint NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "addressee_id" bigint NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "status" text DEFAULT 'pending' NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "responded_at" timestamp
);
CREATE UNIQUE INDEX IF NOT EXISTS "friendships_pair_unique"
  ON "friendships" (LEAST(requester_id, addressee_id), GREATEST(requester_id, addressee_id));
CREATE INDEX IF NOT EXISTS "friendships_requester_id_idx" ON "friendships" ("requester_id");
CREATE INDEX IF NOT EXISTS "friendships_addressee_id_idx" ON "friendships" ("addressee_id");
```

Key decisions:

- **Existing rows are not touched.** Widening `serial`→`bigint` preserves
  all current small integer values (1, 2, 3, ...) and every FK that
  references them. Only *newly inserted* users get real Snowflake-format
  IDs (numerically far larger than any legacy serial value, so the two
  "eras" of IDs can never collide with each other). This was a deliberate
  choice given real signed-up users currently exist in the database.
  Postgres's own `nextval()` sequence is no longer used for new `users.id`
  values — the app generates and supplies the ID explicitly on insert.
- `friendships.id` stays a plain `serial` — it's an internal row identifier
  only, never exposed to clients, so it doesn't need Snowflake treatment.
- `status` only ever holds `'pending'` or `'accepted'`. There is no
  `'declined'` state — declined and cancelled requests are deleted outright
  (see section 4), so a fresh request later is always a plain insert, never
  an update-in-place.
- The `friendships_pair_unique` index (via `LEAST`/`GREATEST`) enforces
  at the DB level that at most one row can exist between any two users
  regardless of direction or status — blocking a duplicate/reverse request
  while one is pending, and blocking a second request once already friends.
- `server/db/schema.js`: `users.id` and the two `friendships` FK columns
  become `bigint('...', { mode: 'bigint' })`; `applications.userId` likewise.
  `users.username` is `text('username').unique()`.

## 3. Username signup flow

- On login, if `users.username` is `null`, the client shows a one-time
  username prompt in Settings (reusing the prior attempt's `SettingsModal`
  pattern). The rest of the app (the applications tracker) works normally
  without a username set — this gate only blocks access to Friends
  features, not the core product.
- `PUT /api/username { username }`:
  - Server-side validation (never trust client-only checks): 3–20
    characters, `[a-z0-9_]` only, lowercased before storing.
  - 400 if malformed.
  - 400 if this user already has a username set (immutable — no update
    path exists once set).
  - 409 if the (lowercased) username is already taken by another user
    (backed by the unique index; a race between two signups attempting the
    same username is resolved by whichever insert wins the unique
    constraint, the loser gets 409 and must pick another).

## 4. Friend request API & flow

- `GET /api/friends/search?username=X` — exact match (case-insensitive,
  compared against the stored lowercase value) only. Returns `{ username }`
  on match (never the internal bigint ID) or 404.
- `POST /api/friends/request { username }` — resolves target user by
  username, inserts a `pending` friendship row
  `(requester_id=me, addressee_id=target)`.
  - 400 — request targets self.
  - 404 — no user with that username.
  - 409 — a row already exists between these two users in either direction
    (covers "request already pending" and "already friends"). Enforced by
    attempting the insert and catching the `friendships_pair_unique`
    constraint violation (`23505`), the same pattern as the username
    uniqueness check — not a SELECT-then-insert check, which would be
    race-prone under concurrent requests.
- `GET /api/friends` — returns three lists for the current user: incoming
  pending (I'm addressee), outgoing pending (I'm requester), accepted
  friends. Every entry exposes only the other user's `username`.
- `POST /api/friends/:id/accept` — only callable by the addressee of that
  row. Sets `status='accepted'`, `responded_at=now()`.
  - 403 — caller is not the addressee.
  - 404 — no such pending request.
- `POST /api/friends/:id/decline` — only callable by the addressee.
  Deletes the row outright.
  - 403 / 404 as above.
- `POST /api/friends/:id/cancel` — only callable by the requester. Deletes
  the row outright.
  - 403 / 404 as above.

Deleting on decline/cancel (rather than keeping a `'declined'` row) means a
future request between the same two people is always a fresh insert — no
update-vs-insert branching, no stale state to reset.

## 5. Error handling summary

| Scenario | Response |
|---|---|
| Username taken | 409 |
| Username invalid format | 400 |
| Username already set (attempting to change) | 400 |
| Friend request to self | 400 |
| Target username doesn't exist | 404 |
| Friendship/request already exists (either direction, either status) | 409 |
| Accept/decline/cancel by non-owner of that side of the row | 403 |
| Accept/decline/cancel on nonexistent/already-resolved request | 404 |
| Snowflake ID collision on user insert | transparent retry ×5, then 500 (should never actually trigger given the bit layout) |

`server/dev-store.js` (the in-memory fallback used when `DATABASE_URL` is
unset) mirrors every check above so behavior is identical with or without
Postgres configured, matching the existing pattern in this codebase.

## 6. UI structure

Reuses the prior attempt's component boundaries, rebuilt against the new
backend:

- `src/components/SettingsModal.jsx` — gains the one-time username field.
- `src/components/FriendsView.jsx` — new nav-level view (added to
  `Header.jsx`), composing:
  - `FriendSearchResults.jsx` — exact-username search box + result +
    "send request" action.
  - `FriendRequestsList.jsx` — incoming requests (accept/decline) and
    outgoing requests (cancel).
  - `FriendsList.jsx` — accepted friends, read-only for now (no unfriend).
- `src/friends-api.js` — thin fetch wrappers for the five endpoints above,
  mirroring the existing `src/api.js`-style pattern used for applications.

## 7. Testing

- `server/id-generator.test.js` — bit-layout correctness, monotonicity,
  sequence rollover within the same millisecond, ID uniqueness under
  rapid-fire synchronous calls, `NODE_ID` env var handling (unset → 0, set
  → reflected in the ID's node bits).
- `server/friends.test.js` — full API coverage, every row in the error
  table above, against a real/mocked Postgres-backed store.
- `server/dev-store.friends.test.js` — same coverage against the in-memory
  store, asserting parity with the Postgres-backed behavior.
- `server/db/schema.test.js` — updated for `bigint` column types and the
  new `friendships` table.
- `src/components/SettingsModal.test.jsx` — username set flow, format
  validation, immutability after set.
- `src/components/FriendsView.test.jsx` — search, send/accept/decline/
  cancel interactions, list rendering.
- `src/App.test.jsx` — username-prompt gating (shown when username is
  null, hidden otherwise).

## Migration/deployment notes

- `npm run db:migrate` applies both new SQL files; no data backfill script
  needed since existing rows are left untouched (see section 2).
- API server requires a restart after this change (no hot reload, per
  existing project convention) — new `NODE_ID` env var should be set
  (or left blank for default `0`) in `.env` before restart.
- `.env.example` gains a `NODE_ID=` line (blank, matching this repo's
  no-real-values convention for example env files).
