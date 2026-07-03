# Tracklane

Every application, one pipeline. Track internship/job applications end to end — applied, OA, interview, offer — with Google sign-in and per-user data.

## Stack

- **Frontend**: React + Vite
- **Backend**: Express
- **Database**: Postgres, via Drizzle ORM
- **Auth**: Google OAuth (Passport), sessions stored in Postgres

## Local development

1. Have a Postgres instance running locally, with a database created for this app.
2. Copy `.env.example` to `.env` and fill in `DATABASE_URL`, `SESSION_SECRET`, and a Google OAuth client's `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET` (redirect URI: `http://localhost:3001/auth/google/callback`).
3. Run migrations: `npm run db:migrate`
4. Start the app: `npm run dev` (Vite on `:5173`, API on `:3001`)

## Deployment

Runs as a Docker container behind nginx. Pushes to `master` trigger `.github/workflows/deploy.yml`, which SSHes into the VPS, rebuilds the image, runs any pending DB migrations, and restarts the container.

Requires these GitHub Actions secrets on the repo: `VPS_HOST`, `VPS_USERNAME`, `VPS_SSH_KEY`.
