# Testing Guide

This document describes how to run the tests, what they currently cover, and what must be verified before a change is considered complete.

## Commands

Run from the repository root.

| Command                | What it runs                         |
| ---------------------- | ------------------------------------ |
| `npm test`             | All server and client tests (Vitest) |
| `npm test -w server`   | Server unit and integration tests    |
| `npm test -w client`   | Client component tests               |
| `npm run lint`         | ESLint                               |
| `npm run typecheck`    | TypeScript in both workspaces        |
| `npm run build`        | Production build of both workspaces  |
| `npm run format:check` | Prettier formatting check            |

**The server tests need the test database.** Before running them:

```bash
npm run db:up
npm run db:migrate:test
```

Run lint, typecheck, test, and build before proposing a commit.

## Test database

Integration tests use an isolated PostgreSQL database, `requests_test`, in the same container as the development database.

- Tests read only `DATABASE_URL_TEST`. The setup file (`server/src/test/setup.ts`) aborts the whole run unless that URL names a database ending in `_test` that differs from `DATABASE_URL`, then removes `DATABASE_URL` from the test process.
- `server/src/app.test.ts` also checks `SELECT current_database()` before running.
- Migrations are applied to the test database separately with `npm run db:migrate:test`.
- Never point tests at the development database or use production data.

## Current tests

### Server (`server/`, Vitest, Supertest)

| File                                   | Covers                                                                                                                                                                                         |
| -------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/app.test.ts`                      | `GET /api/health` returns 200 after a real `SELECT 1` on the test database; a failing database check returns 503 without details; unknown routes return a JSON 404; malformed JSON returns 400 |
| `src/middleware/error-handler.test.ts` | Unexpected errors return a generic 500 without the error message or stack trace (uses an app built inside the test, so production code has no test-only routes)                                |
| `src/config/env.test.ts`               | Environment validation: valid values, `PORT` default, missing or non-PostgreSQL `DATABASE_URL`, invalid `PORT`                                                                                 |

The app receives its database check through dependency injection (`createApp({ checkDatabase })`), so tests can use the real check against the test database or a failing stub.

### Client (`client/`, Vitest, React Testing Library, jsdom)

| File                      | Covers                                                                                                                                        |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/app/Layout.test.tsx` | Header, main navigation, and main landmarks; placeholder page; skip link is the first Tab stop; keyboard-reachable navigation; not-found page |

Client tests use `createMemoryRouter` with the real route table and do not use the network.

### End-to-end

Not set up yet. Playwright end-to-end tests are planned once the request workflow exists.

## Manual checks

With `npm run dev` running:

- http://localhost:5173 shows the app shell; pressing Tab first focuses "Skip to main content" with a visible focus ring.
- http://localhost:5173/api/health returns `{"status":"ok","database":"ok"}`.
- With the database stopped (`docker compose stop postgres`), the same URL returns 503 `{"status":"error","database":"unavailable"}`; it recovers after `docker compose start postgres`.

## Required behavior

As features are added, tests must cover:

- Valid and invalid request creation, including required fields
- Request persistence, listing, and retrieval
- Valid and invalid status updates
- Unknown request IDs
- Loading, empty, success, and error UI states
- The end-to-end workflow: create a request, see it in the list, open it, change its status, reload, and confirm the data persists

## Expectations

- Add or update tests for every behavior change.
- Prefer deterministic tests that do not depend on external services other than the local test database.
- Test observable behavior, not implementation details.
- Do not weaken or remove tests to make a change pass.
- Report failed, skipped, or unavailable checks; never claim a check passed unless it was run.
