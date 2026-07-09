# Tracklane

A personal internship/job application tracker. React (Vite) frontend, Express API backend, Postgres via Drizzle ORM, Google OAuth login.

## Open source: nothing sensitive gets committed

This is a public/open-source repo. Never commit or paste into tracked files:
- `.env` (already gitignored) or any real value from it — `SESSION_SECRET`, `DATABASE_URL` with real credentials, `GOOGLE_CLIENT_SECRET`, etc. Only `.env.example` (blank/placeholder values) belongs in git.
- Real API keys, tokens, cookies, or session data, including in test fixtures, error messages committed as comments, or debug logging left in code.
- Anyone's real personal data (emails, names, application details) in fixtures, test data, or example output. Use obviously-fake data (`test@example.com`, "Acme Corp") instead.
- Database dumps or `tracker.sqlite*` files that might contain real user data.

Before committing, check `git diff`/`git status` for anything that looks like a real secret, not just files you meant to add — a stray `console.log` of a token or an accidentally-staged `.env` is the actual risk, not the obvious cases.

The `POST /api/job-posting` endpoint fetches arbitrary user-supplied URLs server-side (see below); it already has basic SSRF guards (blocks localhost/private-looking hostnames, http(s) only). Keep that in mind if extending it — don't loosen those checks without good reason, and don't add features that fetch-and-execute or fetch-and-eval content from those pages.

## Stack

- **Frontend**: React 18, Vite, plain CSS (`src/style.css`, no framework). No router; `App.jsx` is the whole client.
- **Backend**: Express (`server/index.js`), `express-session` + `connect-pg-simple` for sessions, Passport with `passport-google-oauth20`.
- **Database**: Postgres via `drizzle-orm`. Schema in `server/db/schema.js`. Falls back to an in-memory store (`server/dev-store.js`) per-process if `DATABASE_URL` is unset, so the app runs without Postgres for quick UI iteration (data doesn't persist across restarts in that mode).
- **Tests**: Vitest (`npm test`). Covers `src/utils/applications.js`, some components, and `server/db/schema.js`.

## Running locally

```
npm install
npm run dev          # runs Vite (5173) + API server (3001) together via concurrently
```

Other scripts:
- `npm run dev:client` — Vite only
- `npm run dev:server` — API only (needs `.env`, see below)
- `npm run build` / `npm run preview` — production build/preview
- `npm test` / `npm run test:watch` — Vitest

**The API server does not hot-reload.** It's a plain `node server/index.js` process (no nodemon). Any change under `server/` requires killing and restarting `npm run dev:server` (or the whole `npm run dev`) for it to take effect. The Vite client half hot-reloads fine on its own.

### Env vars (`.env`, see `.env.example`)

- `PORT` (default 3001), `CLIENT_URL` (default `http://localhost:5173`)
- `DATABASE_URL` — Postgres connection string. Omit it to use the in-memory dev store instead.
- `SESSION_SECRET` — required in production; has a dev default otherwise.
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` / `GOOGLE_CALLBACK_URL` — from Google Cloud Console. If any are missing, `hasGoogleAuth` (in `server/auth.js`) is false and `/auth/google` falls back to `localDevLogin`, which logs in as a fake `dev@tracklane.local` user (override with `DEV_AUTH_EMAIL` / `DEV_AUTH_NAME`). Useful for working on the app without setting up OAuth.

## Database migrations

Migrations live in `drizzle/*.sql`, tracked in `drizzle/meta/_journal.json`. Apply them with:

```
npm run db:migrate     # runs server/db/migrate.js against DATABASE_URL
```

**Important deviation from the standard Drizzle workflow**: migrations in this repo have been written by hand (`ALTER TABLE ... ADD COLUMN IF NOT EXISTS ...`) rather than generated via `drizzle-kit generate` diffing a schema snapshot. Only `drizzle/meta/0000_snapshot.json` exists; snapshots for later migrations were never regenerated. This means `npm run db:generate` (drizzle-kit) is unreliable here since it can't diff against an out-of-date snapshot, and `IF NOT EXISTS` is used deliberately so migrations are safe to run against a DB that already has some columns from a manual `ALTER TABLE`.

To add a new column:
1. Add the field to `server/db/schema.js`.
2. Write `drizzle/000N_description.sql` by hand with `ALTER TABLE "applications" ADD COLUMN IF NOT EXISTS ...`.
3. Append an entry to `drizzle/meta/_journal.json` (bump `idx`, unique `tag` matching the filename minus `.sql`).
4. Add the new column key to the `COLUMNS` array in `server/index.js` (used by the bulk save endpoint) if it's an application field.
5. Run `npm run db:migrate`.
6. Restart the API server (see above, no hot reload).

There's also `npm run db:import-sqlite`, a one-off script for importing from a legacy `tracker.sqlite` file (see `server/db/import-sqlite.js`); not part of the normal workflow.

## Data model

Single `applications` table (per-user, `user_id` FK to `users`). Columns roughly: `company`, `role`, `season` (Summer/Fall/Winter, required), `location`, `stack`, `status` (Not Applied → Applied → OA → Phone Screen → Interview → Offer, plus Rejected/Withdrawn), `applied`/`oa`/`interview`/`offer` dates, `comp` + `compPeriod` (Hourly/Daily/Weekly/Monthly/Yearly), `platform`, `link` (job posting URL), `nextAction` + `nextActionDue`, `updatedAt`, `notes`, `archived`.

The frontend doesn't do per-field PATCH requests: `saveApplications()` PUTs the entire application list, and the server replaces all rows for that user in a transaction (`server/index.js`, `PUT /api/applications`). Keep this in mind when adding fields — client and server field lists (`EMPTY_ENTRY` in `src/constants.js`, `COLUMNS` in `server/index.js`, `applications` schema) all need to stay in sync.

`users` also has a nullable, unique `username` — set via Settings, required before the Friends feature is usable. A `friendships` table (`requesterId`/`addresseeId` → `users.id`, `status` `pending`|`accepted`) tracks the friend graph; declining a request deletes the row rather than keeping a `declined` status. No application data is shared between friends yet — this only tracks the connection itself, deliberately structured (one durable row per pair) so a later per-friend visibility layer can attach to it without a schema rework.

## Social / friends

- `server/friends.js` is the first router module split out of the flat `server/index.js` — worth following as the pattern for any future feature with its own multi-endpoint surface and authorization rules (mounted via `app.use('/api', friendsRouter)`), rather than growing `server/index.js` further.
- `server/dev-store.js` mirrors the friendship/username functions for dev-store mode (no `DATABASE_URL`) — keep both paths in sync the same way `getDevApplications`/`replaceDevApplications` already parallel the Drizzle path.
- **The two-sided friend flow can't be tested locally without real Google OAuth.** `localDevLogin` (`server/auth.js`) always creates identity via the in-memory dev-store (`upsertDevUser`) whenever `hasGoogleAuth` is false — this happens *regardless* of whether `DATABASE_URL`/Postgres is configured for applications. Each server process has its own isolated dev-store `Map`s, so **running two server processes with different `DEV_AUTH_EMAIL` values does not work** — confirmed by hand: a user created on one process's dev-store is invisible to a second process, even pointed at the same `DATABASE_URL`, since neither process's identity ever touches Postgres. The only way to exercise send/accept/decline between two real accounts today is real Google OAuth configured with two separate Google accounts. Seeding a second row directly into Postgres `users` doesn't help either — there's no login path that authenticates as a Postgres-seeded user without real OAuth. (A real fix — having `localDevLogin` persist dev users to Postgres when `DATABASE_URL` is set — would unblock this, but is out of scope for the friends feature itself.)

## Job posting auto-fill

`POST /api/job-posting` fetches a job posting URL server-side and tries to extract company/role/location/salary/season/stack. Lives in `server/job-posting/`, built as a strategy pattern rather than one big scraper, since different ATS platforms need genuinely different handling:

- `shared.js` — everything reusable: SSRF-checked URL validation, fetch helpers, JSON-LD parsing, salary/stack/season regex extraction, etc. No dependency on cheerio/jsdom, just regex, kept intentionally lightweight.
- `strategies/generic.js` — the baseline that runs for **every** URL: reads schema.org `JobPosting` JSON-LD if present, falls back to `og:title`/`og:site_name` meta tags, and (as a last resort for location) a "Role (Location) - Season Year | Company" pattern in the page `<title>`. This alone is enough for ATS pages that server-render their content — confirmed working as-is for Ashby and most Greenhouse company career pages.
- `strategies/workday.js` — Workday job pages are a client-rendered shell; the real description (where salary text usually lives) is fetched by the browser separately from a JSON API (`/wday/cxs/{tenant}/{site}/job/{slug}`) that never appears in the server-fetched HTML. This strategy calls that API directly. Also derives company from the subdomain rather than trusting `hiringOrganization.name`, which is often an internal legal-entity string (e.g. `"2100 NVIDIA USA"`).
- `strategies/greenhouse.js` — `boards.greenhouse.io`/`job-boards.greenhouse.io` URLs often redirect to an arbitrary company career site, losing structured data along the way. This strategy calls Greenhouse's public Job Board API (`boards-api.greenhouse.io/v1/boards/{company}/jobs/{id}`) directly instead.
- `index.js` — orchestrates: run generic first, then run a matching strategy (if any) to override/enrich specific fields, then derive `stack`/`season`/final `comp` from the combined description text pulled from every source.

Only add a new strategy when a platform is *proven* to need one (test against a real posting first, the way the existing ones were built) — don't build one speculatively. Tests in `server/job-posting/index.test.js` mock `global.fetch` and cover the pure helpers plus full orchestration per strategy; run them after touching this module, and restart the API server (see "Running locally" above — no hot reload) before testing against a real link in the browser.

## Frontend structure

- `src/App.jsx` — top-level state (auth, applications list, filters, modal state), all mutations go through `persist()` which updates local state then calls `saveApplications()`.
- `src/components/` — `Header` (top navbar, includes the compact `Pipeline` and the Applications/Friends view switch), `Pipeline` (the "route" stage filter, has a `compact` prop for navbar use), `Stats`, `ApplicationsTable` (sortable, column visibility persisted in `localStorage` under `tracklane.table-columns.v1`), `ApplicationModal` (add/edit form), `SettingsModal` (username), `FriendsView` + `FriendSearchResults`/`FriendRequestsList`/`FriendsList` (friend graph UI), `ThemeToggle` (dark/light, persisted under `tracklane.theme`, applied pre-paint via an inline script in `index.html` to avoid a flash), `LoginPanel`.
- `src/friends-api.js` — client wrappers for the friends/username endpoints, separate from `src/api.js` (applications/auth/job-posting) since it's a distinct concern with its own growing surface.
- There's no router; `view` state in `App.jsx` swaps between the Applications and Friends sections in place of a single `<main>`.
- `src/utils/applications.js` — pure helpers: status advancement, validation (duplicate company+role check), date formatting/relative stamps, deadline urgency, empty-state copy.
- `src/constants.js` — shared option lists (`STATUS_OPTIONS`, `SEASON_OPTIONS`, `COMP_PERIOD_OPTIONS`, etc.) and `EMPTY_ENTRY` (the blank form shape).

## Design language

Dark-ink/amber "departures board" theme (not the original dark-violet SaaS look) tying into the "Tracklane" name: transit-line motifs, split-flap style numerals in JetBrains Mono, Space Grotesk for UI text, amber as the single accent color, status colors act as distinct "line colors". Full light theme exists via `:root[data-theme="light"]` in `src/style.css`. Avoid introducing new accent colors or fonts without a reason; keep changes consistent with this system rather than defaulting to generic patterns.

## Deployment

`Dockerfile` does a multi-stage build (Vite build, then a slim `node:22-alpine` runtime serving `dist/` + running `server/index.js`). `docker-compose.yml` runs it with `network_mode: host` and `.env`. No CI config in the repo currently.
