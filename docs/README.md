# Tracklane Docs

This directory is for durable design and architecture notes that help humans
and coding agents understand why the repo is shaped the way it is.

## Structure

- `architecture/` — durable design docs for shipped or intended system areas.
- `architecture/features/` — feature-level docs that span multiple source
  folders, such as a React component plus Express routes plus schema changes.
- `superpowers/plans/` — execution plans produced during implementation. These
  are useful history, but they are not the canonical long-term design docs.

## When To Add A Doc

Add or update a focused doc when a change introduces a cross-cutting behavior,
data model, external integration, or non-obvious tradeoff. Do not create one
markdown file per source file. Do not put durable docs under temporary feature
folders like `feat/...`.

Good examples:

- `architecture/features/usernames-and-friends.md`
- `architecture/features/job-posting-autofill.md`
- `architecture/data-model.md`
- `architecture/development-and-deployment.md`

Keep each doc scoped to one domain. Link to code paths and tests, but avoid
duplicating implementation details line-by-line.
