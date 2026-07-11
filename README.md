# Tracklane

Tracklane helps you keep internship and job applications organized in one place.

Use it to:
- Log each company you apply to
- Track the season, role, location, stack, and compensation
- Move applications through stages like applied, OA, interview, and offer
- Add follow-up notes and reminders so nothing gets lost
- Filter the board to focus on what needs attention now
- Use quick keyboard shortcuts to move faster while updating entries

## How to use it

1. Sign in.
2. Add a new application.
3. Pick the internship season, then fill in any details you know.
4. Update the status as the process moves forward.
5. Add follow-up actions or notes when you need to come back later.
6. Use the filters and column toggles to keep the board focused.

## Keyboard shortcuts

- `Ctrl + Alt + N` opens a new entry
- `Ctrl + Enter` saves the entry while the modal is open

## Running locally

If you are running the app yourself:
1. Set up the required environment variables for your local installation.
2. Start the app with `npm run dev`.
3. Open the app in your browser and sign in.

If Google sign-in is not configured in local development, the app falls back to a local login so you can still try the workflow end to end.

## Running with Docker for development

Use the dev compose file to run the frontend and backend in separate containers:

```bash
docker compose -f docker-compose.dev.yml up --build
```

Then open `http://localhost:5173`.

The dev stack uses the in-memory fallback store unless you provide `DATABASE_URL`.
The Vite container proxies `/api` and `/auth` to the backend container through
`VITE_API_PROXY_TARGET=http://server:3001`.

Useful commands:

```bash
docker compose -f docker-compose.dev.yml down
docker compose -f docker-compose.dev.yml logs -f server
docker compose -f docker-compose.dev.yml logs -f client
```

## CI

Pull requests and pushes to `master` run GitHub Actions CI:

- `npm ci`
- `npm test`
- `npm run build`
- production Docker image build

## Notes

- The app is designed to work best as a daily tracking board, not just a record of past applications.
- The season picker is limited to `Summer`, `Fall`, and `Winter` to keep entries consistent.
