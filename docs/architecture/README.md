# Architecture Docs

Tracklane is a monorepo, but it is not split into microservices. Documentation
should therefore be organized by **domain boundary**, not by deployment unit.

## Placement Strategy

Use these rules:

- Put cross-cutting feature docs in `docs/architecture/features/`.
- Put whole-system docs directly under `docs/architecture/`.
- Keep short local `README.md` files near code only when a subdirectory is a
  self-contained module with its own extension rules.
- Keep implementation checklists and task plans under `docs/superpowers/plans/`
  or another planning area, not mixed with durable architecture docs.

## Current Docs

- `features/usernames-and-friends.md` — username claims, distributed user IDs,
  and friend-request behavior.

## Doc Template

Use this shape for new feature docs:

1. Purpose
2. Source Map
3. Data Model
4. API / UI Behavior
5. Invariants
6. Testing
7. Known Non-Goals
